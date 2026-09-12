"""Assemble the GitHub Pages site from an explicit, shared deployment manifest."""
from pathlib import Path
import shutil

ROOT = Path(__file__).resolve().parents[1]
PUBLIC_ENTRIES = (
    'index.html', 'style.css', 'weather-bot.html', 'weather-bot.js',
    'lab-pass.html', 'community.html', 'privacy.html', 'terms.html', 'lab.js',
    'CNAME', 'assets', 'data', 'games', 'tools', 'econ-arcade', 'docs', 'travel', 'devin',
)


def build():
    output = ROOT / '_site'
    if output.is_symlink():
        raise ValueError('The build directory must not be a symbolic link')
    if output.exists():
        shutil.rmtree(output)
    output.mkdir()
    ignore = shutil.ignore_patterns('__pycache__', '*.pyc', '.env', '.env.*', 'node_modules', '.git', 'backend')
    for entry in PUBLIC_ENTRIES:
        source = ROOT / entry
        target = output / entry
        if source.is_dir():
            shutil.copytree(source, target, ignore=ignore)
        else:
            shutil.copy2(source, target)
    (output / 'ai-edit-factory').mkdir()
    for name in ['index.html', 'style.css', 'README.md']:
        shutil.copy2(ROOT / 'ai-edit-factory' / name, output / 'ai-edit-factory' / name)
    (output / '.nojekyll').touch()
    print(f'Built GitHub Pages artifact in {output}')
    return output


if __name__ == '__main__':
    build()
