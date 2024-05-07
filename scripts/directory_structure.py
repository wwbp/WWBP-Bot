import os


def list_files(startpath):
    ignore_dirs = {'__pycache__', '.git',
                   'node_modules'}  # Directories to ignore
    ignore_extensions = {'.pyc', '.log'}  # File extensions to ignore

    for root, dirs, files in os.walk(startpath):
        # Filter out ignored directories to prevent walking into them
        dirs[:] = [d for d in dirs if d not in ignore_dirs]

        level = root.replace(startpath, '').count(os.sep)
        indent = ' ' * 4 * (level)
        print('{}{}/'.format(indent, os.path.basename(root)))

        subindent = ' ' * 4 * (level + 1)
        for f in files:
            if os.path.splitext(f)[1] not in ignore_extensions:
                print('{}{}'.format(subindent, f))


list_files("/Users/aps/UPenn/WWBP-BOT")
