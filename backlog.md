pretty-markdown-pdf: markdown-pdf.js -> 136、141需要注释掉

compress command: `terser --compress --mangle -- %1 > temp.js && mv temp.js %1`, save as batch