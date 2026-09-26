#!/usr/bin/env python3
import json, os, pathlib, re, select, shutil, subprocess, sys, tempfile, time

ALLOWED_URLS = {"https://auth.openai.com/codex/device", "https://chatgpt.com/codex/device"}

def main():
    if len(sys.argv) != 2:
        raise SystemExit("usage: remote-codex-device-probe.py /path/to/codex")
    binary = os.path.abspath(sys.argv[1])
    root = tempfile.mkdtemp(prefix="osiris-codex-probe-")
    codex_home = os.path.join(root, "codex")
    workspace = os.path.join(root, "workspace")
    os.makedirs(codex_home, mode=0o700)
    os.makedirs(workspace, mode=0o700)
    pathlib.Path(codex_home, "config.toml").write_text(
        'cli_auth_credentials_store = "ephemeral"\n'
        'forced_login_method = "chatgpt"\n'
        'model_provider = "openai"\n'
        'sandbox_mode = "read-only"\n'
        'web_search = "disabled"\n'
        '[history]\n'
        'persistence = "none"\n'
    )
    env = {
        "PATH": os.environ.get("PATH", ""),
        "LANG": "C.UTF-8",
        "TMPDIR": root,
        "CODEX_HOME": codex_home,
        "HOME": root,
    }
    proc = subprocess.Popen(
        [binary, "-c", 'forced_login_method="chatgpt"', "app-server", "--listen", "stdio://"],
        cwd=workspace, env=env, stdin=subprocess.PIPE, stdout=subprocess.PIPE,
        stderr=subprocess.DEVNULL, text=True, bufsize=1
    )
    counter = 0
    def send(obj):
        proc.stdin.write(json.dumps(obj, separators=(",", ":")) + "\n")
        proc.stdin.flush()
    def rpc(method, params=None, timeout=25):
        nonlocal counter
        counter += 1
        request_id = counter
        send({"id": request_id, "method": method, "params": params or {}})
        deadline = time.time() + timeout
        while time.time() < deadline:
            if proc.poll() is not None:
                raise RuntimeError("Codex App Server exited before replying.")
            remaining = max(0.1, deadline - time.time())
            ready, _, _ = select.select([proc.stdout], [], [], remaining)
            if not ready:
                continue
            line = proc.stdout.readline()
            if not line:
                continue
            msg = json.loads(line)
            if "method" in msg and "id" in msg:
                send({"id": msg["id"], "error": {"code": -32601, "message": "Probe has no action tools."}})
                continue
            if msg.get("id") != request_id:
                continue
            if "error" in msg:
                raise RuntimeError("Codex App Server returned an RPC error.")
            return msg.get("result")
        raise TimeoutError(method + " timed out")
    try:
        rpc("initialize", {"clientInfo": {"name": "osiris_probe", "title": "Osiris Probe", "version": "1"}, "capabilities": {"experimentalApi": False}})
        send({"method": "initialized"})
        account = rpc("account/read", {"refreshToken": False})
        if account.get("account") is not None:
            raise RuntimeError("Probe unexpectedly found ambient account credentials.")
        login = rpc("account/login/start", {"type": "chatgptDeviceCode"}, timeout=30)
        if login.get("type") != "chatgptDeviceCode":
            raise RuntimeError("Unexpected login type.")
        if login.get("verificationUrl") not in ALLOWED_URLS:
            raise RuntimeError("Unexpected verification URL.")
        if not re.fullmatch(r"[A-Za-z0-9-]{4,32}", str(login.get("userCode", ""))):
            raise RuntimeError("Invalid user-code shape.")
        login_id = login.get("loginId")
        if not isinstance(login_id, str) or not login_id:
            raise RuntimeError("Missing login ID.")
        rpc("account/login/cancel", {"loginId": login_id}, timeout=10)
        print("DIGITALOCEAN_CODEX_DEVICE_LOGIN=PASS")
        print("No device code, account credential, or login URL was logged.")
    finally:
        proc.kill()
        try:
            proc.wait(timeout=5)
        except Exception:
            pass
        shutil.rmtree(root, ignore_errors=True)

if __name__ == "__main__":
    main()
