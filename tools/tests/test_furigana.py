import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from furigana import align, merge, reading_of, text_of, to_hiragana  # noqa: E402


class AlignTest(unittest.TestCase):
    def test_okurigana(self):
        self.assertEqual(align("赤い", "あかい"), [{"t": "赤", "r": "あか"}, {"t": "い"}])

    def test_prefix_and_suffix_kana(self):
        self.assertEqual(
            align("お母さん", "おかあさん"),
            [{"t": "お"}, {"t": "母", "r": "かあ"}, {"t": "さん"}],
        )

    def test_jukujikun_stays_whole(self):
        self.assertEqual(align("今日", "きょう"), [{"t": "今日", "r": "きょう"}])

    def test_katakana_reading(self):
        self.assertEqual(align("食べ", "タベ"), [{"t": "食", "r": "た"}, {"t": "べ"}])

    def test_no_kanji(self):
        self.assertEqual(align("テレビ", "テレビ"), [{"t": "テレビ"}])

    def test_mismatch_falls_back(self):
        self.assertEqual(align("行く", "ゆかない"), [{"t": "行く", "r": "ゆかない"}])

    def test_merge_and_roundtrip(self):
        segs = merge([{"t": "私", "r": "わたし"}, {"t": "は"}, {"t": "赤", "r": "あか"}, {"t": "い"}, {"t": "です"}])
        self.assertEqual(segs[-1], {"t": "いです"})
        self.assertEqual(text_of(segs), "私は赤いです")
        self.assertEqual(reading_of(segs), "わたしはあかいです")

    def test_to_hiragana(self):
        self.assertEqual(to_hiragana("コーヒー"), "こーひー")


if __name__ == "__main__":
    unittest.main()
