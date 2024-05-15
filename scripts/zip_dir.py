import os
import zipfile

def zipdir(path, ziph):
    # Zip the directory, excluding certain directories
    for root, dirs, files in os.walk(path):
        if 'node_modules' in dirs:
            dirs.remove('node_modules')
        if '__pycache__' in dirs:
            dirs.remove('__pycache__')
        if 'venv' in dirs:
            dirs.remove('venv')
        for file in files:
            ziph.write(os.path.join(root, file),
                       os.path.relpath(os.path.join(root, file), path))

zipf = zipfile.ZipFile('monorepo.zip', 'w', zipfile.ZIP_DEFLATED)
zipdir('.', zipf)
zipf.close()
