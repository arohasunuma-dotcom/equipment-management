export interface Prefecture {
  code: number
  name: string
  col: number
  row: number
  colSpan?: number
  rowSpan?: number
}

export const PREFECTURES: Prefecture[] = [
  { code: 1,  name: '北海道', col: 10, row: 1, colSpan: 3, rowSpan: 2 },
  { code: 2,  name: '青森',   col: 10, row: 3 },
  { code: 3,  name: '岩手',   col: 11, row: 3 },
  { code: 4,  name: '宮城',   col: 11, row: 4 },
  { code: 5,  name: '秋田',   col: 9,  row: 3 },
  { code: 6,  name: '山形',   col: 9,  row: 4 },
  { code: 7,  name: '福島',   col: 10, row: 4 },
  { code: 8,  name: '茨城',   col: 12, row: 5 },
  { code: 9,  name: '栃木',   col: 11, row: 5 },
  { code: 10, name: '群馬',   col: 10, row: 5 },
  { code: 11, name: '埼玉',   col: 11, row: 6 },
  { code: 12, name: '千葉',   col: 12, row: 6 },
  { code: 13, name: '東京',   col: 11, row: 7 },
  { code: 14, name: '神奈川', col: 11, row: 8 },
  { code: 15, name: '新潟',   col: 9,  row: 5 },
  { code: 16, name: '富山',   col: 7,  row: 6 },
  { code: 17, name: '石川',   col: 6,  row: 6 },
  { code: 18, name: '福井',   col: 6,  row: 7 },
  { code: 19, name: '山梨',   col: 10, row: 7 },
  { code: 20, name: '長野',   col: 9,  row: 6 },
  { code: 21, name: '岐阜',   col: 8,  row: 7 },
  { code: 22, name: '静岡',   col: 10, row: 8 },
  { code: 23, name: '愛知',   col: 9,  row: 8 },
  { code: 24, name: '三重',   col: 8,  row: 8 },
  { code: 25, name: '滋賀',   col: 7,  row: 8 },
  { code: 26, name: '京都',   col: 7,  row: 9 },
  { code: 27, name: '大阪',   col: 8,  row: 9 },
  { code: 28, name: '兵庫',   col: 6,  row: 9 },
  { code: 29, name: '奈良',   col: 8,  row: 10 },
  { code: 30, name: '和歌山', col: 8,  row: 11 },
  { code: 31, name: '鳥取',   col: 5,  row: 9 },
  { code: 32, name: '島根',   col: 4,  row: 9 },
  { code: 33, name: '岡山',   col: 5,  row: 10 },
  { code: 34, name: '広島',   col: 4,  row: 10 },
  { code: 35, name: '山口',   col: 3,  row: 10 },
  { code: 36, name: '徳島',   col: 7,  row: 11 },
  { code: 37, name: '香川',   col: 6,  row: 11 },
  { code: 38, name: '愛媛',   col: 5,  row: 11 },
  { code: 39, name: '高知',   col: 6,  row: 12 },
  { code: 40, name: '福岡',   col: 3,  row: 11 },
  { code: 41, name: '佐賀',   col: 2,  row: 11 },
  { code: 42, name: '長崎',   col: 1,  row: 11 },
  { code: 43, name: '熊本',   col: 3,  row: 12 },
  { code: 44, name: '大分',   col: 4,  row: 11 },
  { code: 45, name: '宮崎',   col: 4,  row: 12 },
  { code: 46, name: '鹿児島', col: 3,  row: 13 },
  { code: 47, name: '沖縄',   col: 1,  row: 15 },
]

export const PREFECTURE_MAP: Record<number, string> = Object.fromEntries(
  PREFECTURES.map((p) => [p.code, p.name])
)
