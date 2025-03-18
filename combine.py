import os


def collect_py_files(directory):
    """
    Walk through the directory recursively and collect all .py files.
    Returns a sorted list of file paths relative to the given directory.
    """
    py_files = []
    for root, dirs, files in os.walk(directory):
        for file in files:
            if file.endswith(".js") or file.endswith(".css"):
                full_path = os.path.join(root, file)
                rel_path = os.path.relpath(full_path, directory)
                py_files.append(rel_path)
    return sorted(py_files)


def build_tree(paths):
    """
    Build a nested dictionary (tree) from a list of relative file paths.
    Each part of the path becomes a key in the nested dictionary.
    """
    tree = {}
    for path in paths:
        parts = path.split(os.sep)
        current = tree
        for part in parts:
            if part not in current:
                current[part] = {}
            current = current[part]
    return tree


def tree_to_lines(tree, prefix=""):
    """
    Convert the nested dictionary (tree) into a list of lines representing a tree structure.
    """
    lines = []
    keys = sorted(tree.keys())
    for i, key in enumerate(keys):
        connector = "└── " if i == len(keys) - 1 else "├── "
        lines.append(prefix + connector + key)
        if tree[key]:
            extension = "    " if i == len(keys) - 1 else "│   "
            lines.extend(tree_to_lines(tree[key], prefix + extension))
    return lines


def combine_py_files(directory, output_file="combined.py"):
    # Collect all .py files with their relative paths.
    py_files = collect_py_files(directory)

    # Generate the directory structure tree (only including .py files).
    tree = build_tree(py_files)
    tree_lines = tree_to_lines(tree)

    with open(output_file, "w", encoding="utf-8") as outfile:
        # Write the directory structure at the top of the file.
        outfile.write("# Directory Structure:\n")
        for line in tree_lines:
            outfile.write("# " + line + "\n")
        outfile.write("\n\n")

        # Append each file's content, preceded by a header showing its relative path.
        for rel_path in py_files:
            full_path = os.path.join(directory, rel_path)
            outfile.write(f"# File: {rel_path}\n")
            try:
                with open(full_path, "r", encoding="utf-8") as infile:
                    content = infile.read()
                outfile.write(content)
            except Exception as e:
                outfile.write(f"# Error reading file: {e}\n")
            outfile.write("\n\n")
    print(f"Combined file created: {output_file}")


if __name__ == "__main__":
    # Prompt user for the directory path and optional output file name.
    directory = input(
        "Enter the directory path to search for .js and .css files: ").strip()
    output_file = input(
        "Enter output file name (or press Enter to use 'dds.txt'): ").strip()
    if not output_file:
        output_file = "dds.txt"
    combine_py_files(directory, output_file)
