#!/usr/bin/env python3
"""CopilotJ Bridge 1.1.0 按需检查/安装；不自动启动 Fiji、不修改安全设置。

  check [--fiji /path/to/Fiji.app] [--json]
  install [--fiji /path/to/Fiji.app] --yes [--json]
  install --dest /empty/or/new/plugins/dir --yes [--json]

只下载官方 Release 的固定 JAR，校验 SHA-256 后原子落盘。
默认 Fiji：/Applications/Fiji.app（macOS）；Windows 必须显式指定。
无 --yes 不下载或修改。安装后用户自行启动 Fiji-Latest（Java 17+）并开启 MCP。
"""
import argparse
import hashlib
import json
import os
import pathlib
import shutil
import subprocess
import sys
import tempfile
import urllib.request

VERSION = '1.1.0'
URL = f'https://github.com/neurogeom/CopilotJ/releases/download/v{VERSION}/CopilotJBridge-{VERSION}.jar'
SHA256 = '63152895fecc63db641df2c44aae8a636e5831f5910e2fefe736130a5b3de223'
JAR = f'CopilotJBridge-{VERSION}.jar'
MCP = 'http://127.0.0.1:3001/mcp'


def default_fiji():
    if sys.platform == 'darwin':
        return pathlib.Path('/Applications/Fiji.app')
    return None


def plugins_dir(fiji):
    if sys.platform == 'darwin':
        return fiji / 'plugins'
    return fiji / 'plugins'


def validate_fiji(path):
    if not path.is_dir() or path.is_symlink():
        raise SystemExit(f'Fiji 目录不存在或是符号链接：{path}；请显式指定真实 Fiji 目录。')
    if sys.platform == 'darwin' and path.suffix != '.app':
        raise SystemExit('macOS 请指定 Fiji.app 应用目录。')
    return plugins_dir(path)


def java_version(fiji):
    candidates = []
    if sys.platform == 'darwin':
        candidates += [fiji / 'java/macosx/arm64/bin/java', fiji / 'java/macosx/x86_64/bin/java']
    candidates += list(fiji.glob('java/*/bin/java')) + list(fiji.glob('java/*/bin/java.exe'))
    java = next((path for path in candidates if path.is_file()), shutil.which('java'))
    if not java:
        return {'available': False, 'reason': '未找到 Fiji 内 Java；MCP 需要 Fiji-Latest / Java 17+。'}
    try:
        result = subprocess.run([str(java), '-version'], capture_output=True, text=True, timeout=10)
        text = (result.stdout + result.stderr).strip().splitlines()[0]
        return {'available': result.returncode == 0, 'versionText': text, 'path': str(java),
                'note': '请确认该 Java >=17；Fiji-Stable 的 Java 8 不支持 MCP。'}
    except (OSError, subprocess.TimeoutExpired) as error:
        return {'available': False, 'reason': str(error)}


def report(fiji, dest):
    target = dest / JAR
    installed = target.is_file()
    digest = None
    if installed:
        with target.open('rb') as stream:
            digest = hashlib.file_digest(stream, 'sha256').hexdigest()
    return {'bridgeVersion': VERSION, 'fiji': str(fiji) if fiji else None, 'pluginsDir': str(dest),
            'installed': installed, 'sha256Matches': digest == SHA256 if installed else False,
            'java': java_version(fiji) if fiji else None, 'mcpUrl': MCP,
            'next': '使用 Fiji-Latest（Java 17+）打开 Plugins → CopilotJ → MCP Server，Host 127.0.0.1、Port 3001，点击 Start MCP。'}


def download(url, target):
    request = urllib.request.Request(url, headers={'User-Agent': 'cyberfish-seekbrain-dsh/0.1.4'})
    with urllib.request.urlopen(request, timeout=90) as response:
        if response.status != 200:
            raise SystemExit(f'下载失败 HTTP {response.status}')
        with target.open('wb') as stream:
            shutil.copyfileobj(response, stream, 1024 * 1024)


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('action', choices=['check', 'install'])
    parser.add_argument('--fiji', type=pathlib.Path, default=None)
    parser.add_argument('--dest', type=pathlib.Path, help='仅用于显式指定的独立 plugins 目录，不自动选择系统目录')
    parser.add_argument('--yes', action='store_true', help='确认下载并安装固定官方 JAR；check 不需要')
    parser.add_argument('--json', action='store_true')
    args = parser.parse_args()
    if args.dest and args.fiji:
        parser.error('--dest 与 --fiji 不能同时使用')
    if args.dest:
        dest = args.dest
    else:
        args.fiji = args.fiji or default_fiji()
    if not args.dest and args.fiji:
        dest = validate_fiji(args.fiji)
    elif not args.dest:
        parser.error('未找到默认 Fiji；请指定 --fiji 或独立 --dest')
    if args.action == 'check':
        result = report(args.fiji, dest)
        print(json.dumps(result, ensure_ascii=False, indent=2) if args.json else json.dumps(result, ensure_ascii=False))
        return
    if not args.yes:
        parser.error('install 需要 --yes；请先阅读来源、目标目录和 Java 要求')
    if dest.exists() and not dest.is_dir():
        raise SystemExit(f'目标不是目录：{dest}')
    if (dest / JAR).exists():
        raise SystemExit(f'已有 {JAR}，不覆盖；请先 check 并手动备份/升级。')
    dest.mkdir(parents=True, exist_ok=True)
    handle, temporary = tempfile.mkstemp(prefix='.copilotj-bridge-', suffix='.jar.part', dir=dest)
    os.close(handle)
    temporary_path = pathlib.Path(temporary)
    try:
        print(f'下载官方 CopilotJ Bridge {VERSION}：{URL}')
        download(URL, temporary_path)
        with temporary_path.open('rb') as stream:
            actual = hashlib.file_digest(stream, 'sha256').hexdigest()
        if actual != SHA256:
            raise SystemExit(f'SHA-256 不符：{actual}，拒绝安装；临时文件保留供审计：{temporary_path}')
        temporary_path.chmod(0o644)
        temporary_path.replace(dest / JAR)
    except Exception:
        print(f'安装未完成，未替换正式 JAR；现场保留：{temporary_path}', file=sys.stderr)
        raise
    print(json.dumps(report(args.fiji, dest), ensure_ascii=False, indent=2) if args.json else f'已安装 {dest / JAR}\n{MCP}\n请启动 Fiji-Latest 并手动开启 MCP。')


if __name__ == '__main__':
    main()
