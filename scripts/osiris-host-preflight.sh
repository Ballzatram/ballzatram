#!/usr/bin/env bash
# Run on the intended Linux host. This checks the host's actual Docker/Codex path.
set -Eeuo pipefail

readonly OSIRIS_SOURCE_URL='https://github.com/Ballzatram/ballzatram.git'
readonly OSIRIS_SOURCE_REVISION='99c2584d428878ed477092871327fcc2c5c5be7d'
readonly OSIRIS_CHECK_IMAGE="osiris-host-check:${OSIRIS_SOURCE_REVISION}"
OSIRIS_CHECK_ROOT='/opt/osiris-host-check'
OSIRIS_CHECK_STAGE='arguments'
OSIRIS_CHECK_CONTAINER=''
OSIRIS_CHECK_CONTEXT=''

usage() {
  cat <<'HELP'
Usage: sudo bash osiris-host-preflight.sh [--install-deps]

Runs the pinned Osiris runtime configuration and device-login start/cancel tests
on this Ubuntu 24.04 host. --install-deps permits installing missing git,
ca-certificates, and Ubuntu's docker.io package. An existing Docker install is
retained. The source checkout and built image remain available for deployment.

No website configuration, DNS, firewall, access code, or account is changed.
No HTTPS server is started, no OpenAI account is authorized, and no model runs.
The device-code test creates a temporary login request and immediately cancels
it without displaying its code. A PASS is not proof of inference.
HELP
}

fail() { printf 'OSIRIS_HOST_PREFLIGHT=FAIL stage=%s\n%s\n' "$OSIRIS_CHECK_STAGE" "$*" >&2; exit 1; }

cleanup() {
  local result=$?
  trap - EXIT
  if [[ -n "$OSIRIS_CHECK_CONTAINER" ]]; then
    docker rm -f "$OSIRIS_CHECK_CONTAINER" >/dev/null 2>&1 || true
  fi
  if [[ -n "$OSIRIS_CHECK_CONTEXT" ]]; then
    rm -rf -- "$OSIRIS_CHECK_CONTEXT"
  fi
  if (( result != 0 )); then
    printf 'OSIRIS_HOST_PREFLIGHT=FAIL stage=%s exit=%s\n' "$OSIRIS_CHECK_STAGE" "$result" >&2
    printf 'No website activation was performed. Do not recreate the droplet based on this result alone.\n' >&2
  fi
  exit "$result"
}

verify_host() {
  [[ "$EUID" -eq 0 ]] || fail 'Run this through sudo or the root Droplet Console.'
  # /etc/os-release is host configuration, not a downloaded script.
  source /etc/os-release
  [[ "${ID:-}" == ubuntu && "${VERSION_ID:-}" == 24.04 ]] || fail 'This installer supports Ubuntu 24.04 only.'
  [[ "$(uname -m)" == x86_64 ]] || fail 'This checked deployment target requires an x86_64 host.'
  local memory_kib
  memory_kib=$(awk '/^MemTotal:/ {print $2}' /proc/meminfo)
  (( memory_kib >= 800000 )) || fail 'Use an existing host with at least 1 GB RAM; this script does not resize it.'
}

ensure_dependencies() {
  local allow_install=$1
  local -a packages=()
  command -v git >/dev/null 2>&1 || packages+=(git)
  [[ -s /etc/ssl/certs/ca-certificates.crt ]] || packages+=(ca-certificates)
  command -v docker >/dev/null 2>&1 || packages+=(docker.io)
  if (( ${#packages[@]} )); then
    (( allow_install )) || fail 'Missing dependencies. Re-run with --install-deps to install Ubuntu packages.'
    apt-get update
    DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends "${packages[@]}"
  fi
  if ! docker info >/dev/null 2>&1; then
    systemctl start docker
    docker info >/dev/null 2>&1 || fail 'Docker did not start. Inspect systemctl status docker in this console.'
  fi
}

prepare_source() {
  local source_dir=$1
  if [[ ! -e "$source_dir" ]]; then
    git init --quiet "$source_dir"
    git -C "$source_dir" remote add origin "$OSIRIS_SOURCE_URL"
  fi
  [[ -d "$source_dir/.git" && ! -L "$source_dir" ]] || fail 'The source path already exists and is not this checkout.'
  [[ "$(git -C "$source_dir" remote get-url origin)" == "$OSIRIS_SOURCE_URL" ]] || fail 'The existing checkout has a different remote; it was left untouched.'
  if git -C "$source_dir" rev-parse --verify HEAD >/dev/null 2>&1; then
    [[ "$(git -C "$source_dir" rev-parse HEAD)" == "$OSIRIS_SOURCE_REVISION" ]] || fail 'The existing checkout has a different revision; it was left untouched.'
    [[ -z "$(git -C "$source_dir" status --porcelain)" ]] || fail 'The existing checkout has local changes; they were left untouched.'
  else
    [[ -z "$(git -C "$source_dir" status --porcelain)" ]] || fail 'The incomplete checkout has local files; they were left untouched.'
    git -C "$source_dir" fetch --quiet --depth=1 --filter=blob:none origin "$OSIRIS_SOURCE_REVISION"
    git -C "$source_dir" sparse-checkout init --no-cone
    git -C "$source_dir" sparse-checkout set '/osiris-runtime/' '/assets/ai-features.js' '/tools/parcel/core.js'
    git -C "$source_dir" checkout --quiet --detach "$OSIRIS_SOURCE_REVISION"
  fi
  [[ "$(git -C "$source_dir" rev-parse HEAD)" == "$OSIRIS_SOURCE_REVISION" ]] || fail 'Source revision verification failed.'
}

prepare_build_context() {
  local source_dir=$1
  local revision=${2:-$OSIRIS_SOURCE_REVISION}
  OSIRIS_CHECK_CONTEXT=$(mktemp -d "$OSIRIS_CHECK_ROOT/build.XXXXXX")
  # The host work directory and checkout stay private. Git's tracked archive
  # supplies a separate context with normal source permissions for USER node.
  # Never copy .git, untracked files, or a host's private .env into this context.
  (
    umask 022
    git -C "$source_dir" archive --format=tar "$revision" \
      osiris-runtime assets/ai-features.js tools/parcel/core.js \
      | tar --extract --file=- --directory="$OSIRIS_CHECK_CONTEXT" \
          --no-same-owner --no-same-permissions
  )
}

run_check() {
  local script=$1
  OSIRIS_CHECK_STAGE="$script"
  # --rm plus the EXIT trap clean up on both success and an interrupted console.
  # No host directories, Docker socket, credentials, or environment are mounted.
  docker run --rm --name "$OSIRIS_CHECK_CONTAINER" --init --read-only \
    --cap-drop=ALL --security-opt=no-new-privileges:true \
    --pids-limit=128 --memory=512m --cpus=1 \
    --tmpfs /tmp:rw,nosuid,nodev,noexec,size=256m,mode=0700,uid=1000,gid=1000 \
    "$OSIRIS_CHECK_IMAGE" node "scripts/$script"
}

main() {
  local allow_install=0
  while (( $# )); do
    case "$1" in
      --install-deps) allow_install=1 ;;
      --help|-h) usage; return 0 ;;
      *) fail "Unknown option: $1" ;;
    esac
    shift
  done
  OSIRIS_CHECK_STAGE='host'
  verify_host
  umask 077
  [[ ! -L "$OSIRIS_CHECK_ROOT" ]] || fail 'The work directory must not be a symbolic link.'
  mkdir -p "$OSIRIS_CHECK_ROOT"
  exec 9>"$OSIRIS_CHECK_ROOT/.lock"
  flock -n 9 || fail 'Another Osiris host check is running.'
  OSIRIS_CHECK_CONTAINER="osiris-host-check-$$-${RANDOM}${RANDOM}"
  trap cleanup EXIT
  trap 'exit 130' INT
  trap 'exit 143' TERM
  OSIRIS_CHECK_STAGE='dependencies'
  ensure_dependencies "$allow_install"
  local source_dir="$OSIRIS_CHECK_ROOT/$OSIRIS_SOURCE_REVISION"
  OSIRIS_CHECK_STAGE='source'
  prepare_source "$source_dir"
  OSIRIS_CHECK_STAGE='build'
  prepare_build_context "$source_dir"
  docker build --pull -t "$OSIRIS_CHECK_IMAGE" -f "$OSIRIS_CHECK_CONTEXT/osiris-runtime/Dockerfile" "$OSIRIS_CHECK_CONTEXT"
  run_check check-runtime.mjs
  run_check check-device-login.mjs
  OSIRIS_CHECK_STAGE='complete'
  printf '\nOSIRIS_HOST_PREFLIGHT=PASS\nSource revision: %s\n' "$OSIRIS_SOURCE_REVISION"
  printf 'Configuration, isolation, cleanup, and device-login start/cancel passed on this host.\n'
  printf 'No account authorization or inference was performed. No public service was started.\n'
  printf 'Next: configure HTTPS, run check-deployment.mjs, then perform one explicit in-page account test.\n'
}

if [[ "${BASH_SOURCE[0]}" == "$0" ]]; then main "$@"; fi
