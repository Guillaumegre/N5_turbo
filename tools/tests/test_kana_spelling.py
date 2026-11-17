import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from build_n5 import SentenceFurigana  # noqa: E402
from furigana import text_of  # noqa: E402


class KanaSpellingTest(unittest.TestCase):
    """Example sentences use the everyday spelling: kana for words usually written in kana."""

    @classmethod
    def setUpClass(cls):
        cls.sf = SentenceFurigana({})

    def spell(self, text: str) -> str:
        return text_of(self.sf.segments(text))

    def test_auxiliaries_and_verbs(self):
        self.assertEqual(self.spell("窓を開けて下さい。"), "窓を開けてください。")
        self.assertEqual(self.spell("私は泳ぐことが出来ます。"), "私は泳ぐことができます。")
        self.assertEqual(self.spell("その時私は家に居ました。"), "その時私は家にいました。")
        self.assertEqual(self.spell("沢山の本が有ります。"), "たくさんの本があります。")

    def test_formal_nouns_and_suffixes(self):
        self.assertEqual(self.spell("危ない事をするな。"), "危ないことをするな。")
        self.assertEqual(self.spell("今出かける所です。"), "今出かけるところです。")
        self.assertEqual(self.spell("女の子達はどこ？"), "女の子たちはどこ？")
        self.assertEqual(self.spell("午後３時頃はどう。"), "午後３時ごろはどう。")

    def test_same_spelling_as_word_cards(self):
        self.assertEqual(self.spell("お腹が痛いの。"), "おなかが痛いの。")
        self.assertEqual(self.spell("明後日の晩帰ります。"), "あさっての晩帰ります。")
        self.assertEqual(self.spell("入口で待つ。"), "入り口で待つ。")

    def test_kanji_kept_where_natural(self):
        self.assertEqual(self.spell("台所に友達がいます。"), "台所に友達がいます。")
        self.assertEqual(self.spell("飲み物を買いました。"), "飲み物を買いました。")
        self.assertEqual(self.spell("仕事は大事です。"), "仕事は大事です。")


if __name__ == "__main__":
    unittest.main()
