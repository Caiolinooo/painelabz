import sys
import io

# Redirect stdout to a file to avoid console encoding issues
sys.stdout = io.open('F:/Code/0_Painel ABZ-BR-INT/painel-abz/scripts/output.txt', 'w', encoding='utf-8')

with open('F:/Code/0_Painel ABZ-BR-INT/painel-abz/src/app/contratos/[id]/page.tsx', 'rb') as f:
    data = f.read()

text = data.decode('utf-8', errors='replace')
lines = text.split('\n')

print("Total lines:", len(lines))
print("Total bytes:", len(data))

# Check BOM
print("BOM present:", data[:3] == b'\xef\xbb\xbf')

# Detailed byte inspection of EVERY non-ASCII byte in the file
print("\n=== ALL NON-ASCII BYTES ===")
for i, ch in enumerate(text):
    code = ord(ch)
    if code > 127:
        line_num = text[:i].count('\n') + 1
        col = i - text.rfind('\n', 0, i)
        print("  Byte at pos %d, Line %d, Col %d: U+%04X (%s), hex=%s" % (i, line_num, col, code, repr(ch), hex(code)))

# Full hex dump of the area around lines 346-355
print("\n=== HEX DUMP: Lines 346-355 ===")
for i in range(len(lines)):
    line_num = i + 1
    if 345 <= line_num <= 355:
        line_text = lines[i]
        line_bytes = line_text.encode('utf-8')
        print("Line %d (%d bytes): %s" % (line_num, len(line_bytes), line_bytes.hex()))
        for j, b in enumerate(line_bytes):
            if b > 127:
                char_bytes = line_bytes[j:j+4]
                try:
                    ch = char_bytes.decode('utf-8')
                except:
                    ch = "?"
                print("  Non-ASCII byte at col %d: 0x%02X, char=%s" % (j+1, b, repr(ch)))

# Check for @ characters in the file
print("\n=== ALL '@' CHARACTERS ===")
for i, line in enumerate(lines, 1):
    for j, ch in enumerate(line):
        if ch == '@':
            ctx = line[max(0,j-5):j+5]
            print("  Line %d, Col %d: context=%s" % (i, j+1, repr(ctx)))

# Bracket analysis
print("\n=== BRACKET COUNTS ===")
count_curly_open = sum(1 for c in text if c == '{')
count_curly_close = sum(1 for c in text if c == '}')
count_paren_open = sum(1 for c in text if c == '(')
count_paren_close = sum(1 for c in text if c == ')')
print("Curly braces: open=%d close=%d balanced=%s" % (count_curly_open, count_curly_close, count_curly_open == count_curly_close))
print("Parentheses: open=%d close=%d balanced=%s" % (count_paren_open, count_paren_close, count_paren_open == count_paren_close))

print("\n=== END OF ANALYSIS ===")
sys.stdout.close()