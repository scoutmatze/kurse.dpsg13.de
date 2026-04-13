#!/bin/bash
# DPSG Kursmanagement — Update Deploy Script
# Run on server: bash deploy-update.sh

set -e
cd ~/kursmanagement

echo "=== 1. Extracting update files ==="
tar xzf ~/kursmanagement-update.tar.gz --strip-components=1

echo "=== 2. Running DB migration ==="
docker compose exec -T db psql -U dpsg -d dpsg_kurse < migration-update.sql

echo "=== 3. Adding Packliste tab to layout ==="
# Add Packliste tab if not already there
python3 -c "
path = 'src/app/kurs/[id]/layout.tsx'
with open(path, 'r') as f:
    c = f.read()
if 'packliste' not in c:
    c = c.replace(
        '{ id: \"dateien\", label: \"Dateien\", icon: FolderOpen, href: \"/dateien\" },',
        '{ id: \"dateien\", label: \"Dateien\", icon: FolderOpen, href: \"/dateien\" },\n  { id: \"packliste\", label: \"Packliste\", icon: Package, href: \"/packliste\" },'
    )
    # Add Package import
    c = c.replace(
        'UtensilsCrossed, Building2, Settings',
        'UtensilsCrossed, Building2, Settings, Package'
    )
    with open(path, 'w') as f:
        f.write(c)
    print('Packliste tab added')
else:
    print('Packliste tab already exists')
"

echo "=== 4. Adding Druckansicht link to Tagesplan ==="
python3 -c "
path = 'src/app/kurs/[id]/programm/page.tsx'
with open(path, 'r') as f:
    c = f.read()
if 'druckansicht' not in c:
    c = c.replace(
        'className=\"flex items-center gap-1.5 rounded-lg bg-dpsg-blue px-3 py-2 text-xs font-bold text-white hover:bg-dpsg-blue-light transition-colors\">',
        '''className=\"flex items-center gap-1.5 rounded-lg bg-dpsg-blue px-3 py-2 text-xs font-bold text-white hover:bg-dpsg-blue-light transition-colors\">''',
        1
    )
    # Add print button before the add button
    c = c.replace(
        '{currentTag && currentTag.blocks.length === 0 && (',
        '''<a href={\`/kurs/\${kursId}/programm/druckansicht\`} target=\"_blank\"
            className=\"flex items-center gap-1.5 rounded-lg bg-dpsg-gray-100 px-3 py-2 text-xs font-bold text-dpsg-gray-700 hover:bg-dpsg-gray-200 transition-colors\">
            Druckansicht
          </a>
          {currentTag && currentTag.blocks.length === 0 && ('''
    )
    with open(path, 'w') as f:
        f.write(c)
    print('Druckansicht link added')
else:
    print('Druckansicht link already exists')
"

echo "=== 5. Building ==="
docker compose up -d --build

echo "=== Done! ==="
echo "New features:"
echo "  - Anmeldungen: Status ändern (Bestätigen/Stornieren/Warteliste) per Menü"
echo "  - Anmeldungen: Bezahlt-Toggle per Klick"
echo "  - Anmeldungen: KJP-Export + Bescheinigungen"
echo "  - Tagesplan: Druckansicht"
echo "  - Packliste: Neuer Tab mit Standard-Vorlage"
echo "  - Packliste: Wird im TN-Portal angezeigt"
