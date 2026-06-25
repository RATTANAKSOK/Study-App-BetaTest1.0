from collections import Counter
import re
p = 'script.js'
text = open(p,encoding='utf-8').read()
names = re.findall(r'function\s+(\w+)\s*\(', text)
dup = [(k,v) for k,v in Counter(names).items() if v>1]
print('duplicate functions:', dup)
# also report window.onload occurrences
print('window.onload count:', text.count('window.onload'))
print('backtick count:', text.count('`'))
