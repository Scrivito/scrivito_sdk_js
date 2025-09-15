export function slugify(input: string): string {
  if (!mapping.length) lazyInitializeMapping();

  return input
    .normalize('NFKC')
    .replace(/\W/g, transformChar)
    .replace(/\W+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
}

function transformChar(inputChar: string) {
  for (let low = 0, high = mapping.length; low < high; ) {
    const midIndex = (low + high) >> 1; // eslint-disable-line no-bitwise -- performance optimization
    const comparison = compare(inputChar, mapping[midIndex][0]);
    if (comparison === 0) return mapping[midIndex][1];
    if (comparison < 0) high = midIndex;
    else low = midIndex + 1;
  }
  return '-';
}

const { compare } = Intl.Collator('de', {
  collation: 'phonebk',
  sensitivity: 'base',
});

const mapping: [string, string][] = [];

function lazyInitializeMapping() {
  const transforms: [number, string][] = [
    [0x00d6, 'Oe.....Ue.ThSs....Ae'], // 'ö', 'ü', 'Þ', 'ß', 'ä'
    [0x0131, 'i'], // 'ı'
    [0x0191, 'f'], // 'Ƒ'
    [0x0391, 'avgdeziThiklmnxopr.styfChPso'], // Greek ISO 843
    [0x0430, 'abvgdeZhzijklmnoprstufhcChShSHh_y_eYuYa..Dj.ezi.jlnc...Dj'], // Cyrillic ISO/R 9, GOST 7.79-2000 (shorter wins)
    [0x0531, 'abgdYezeytZhilKhTskhDzGhChmynShVoChpjRrsvtrTswpkof'], // Armenian BGN/PCGN, ISO 9985 for 'ւ'
    [0x0621, '_aawayabttThjhKhdDhrzsShsdtz_Gh....._fqklmnhwyy'], // Arabic UNGEGN
    [0x10d0, 'abgdevztiklmnopZhrstupkGhqShChTsDzTsChKhjheywhof'], // Georgian ISO 9984:2025
    [0x2460, '===================='], // '1'...'20'
    [0x24d0, '==========================='], // 'a'...'z', '0'
  ];

  transforms.forEach(([charCode, targets]) =>
    // non-null assertion `!`: all inputs do match
    targets.match(/[A-Z]*./g)!.forEach((target, i) => {
      if (target === '.') return;
      const source = String.fromCharCode(charCode + i).normalize('NFKC');
      mapping.push([
        source,
        target === '=' ? source : target === '_' ? '' : target,
      ]);
    })
  );

  mapping.sort(([a], [b]) => compare(a, b));
}
