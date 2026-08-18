import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  formatRecommendationItem,
  formatRecommendationList,
} from "../../recommendation/RecommendationFormatter.js";

describe("RecommendationFormatter", () => {
  test("strictly filters out confidential/operational fields from student response", () => {
    const rawDataWithConfidentialFields = {
      book_id: 101,
      title: "Clean Code",
      ISBN: "9780132350884",
      image: "image_url_101",
      author: "Robert C. Martin",
      genre: "Software",
      date: "2008-08-01",
      status: "Available",
      // Confidential fields that must NEVER be exposed:
      total_copies: 10,
      total_copy: 10,
      available_copies: 4,
      issued_copy: 6,
      shelf_location: "Shelf A-3, Row 2",
      description: "Detailed internal book description",
      pages: 464,
    };

    const formatted = formatRecommendationItem({
      liveBook: rawDataWithConfidentialFields,
      score: 0.891234567,
      isLiked: true,
    });

    assert.ok(formatted !== null);
    assert.strictEqual(formatted.book_id, 101);
    assert.strictEqual(formatted.title, "Clean Code");
    assert.strictEqual(formatted.ISBN, "9780132350884");
    assert.strictEqual(formatted.author, "Robert C. Martin");
    assert.strictEqual(formatted.genre, "Software");
    assert.strictEqual(formatted.is_liked, true);
    assert.strictEqual(formatted.score, 0.891235); // rounded to 6 decimal places

    // Confidential fields must NOT exist in the output object
    assert.strictEqual(formatted.total_copies, undefined);
    assert.strictEqual(formatted.total_copy, undefined);
    assert.strictEqual(formatted.available_copies, undefined);
    assert.strictEqual(formatted.issued_copy, undefined);
    assert.strictEqual(formatted.shelf_location, undefined);
    assert.strictEqual(formatted.description, undefined);
    assert.strictEqual(formatted.pages, undefined);

    const keys = Object.keys(formatted);
    assert.deepStrictEqual(keys.sort(), [
      "ISBN",
      "author",
      "book_id",
      "date",
      "genre",
      "image",
      "is_liked",
      "score",
      "status",
      "title",
    ].sort());
  });

  test("formatRecommendationList joins live books, attaches like flags, and drops missing books", () => {
    const ranked = [
      { book_id: 1, score: 0.95 },
      { book_id: 2, score: 0.85 },
      { book_id: 999, score: 0.75 }, // deleted / not in live DB
    ];

    const liveBooks = [
      { book_id: 1, title: "Book One", ISBN: "111", author: "Author One", genre: "Tech", status: "Available" },
      { book_id: 2, title: "Book Two", ISBN: "222", author: "Author Two", genre: "Sci-Fi", status: "Available" },
    ];

    const likedBooks = [
      { book_id: 1 },
    ];

    const result = formatRecommendationList({ ranked, liveBooks, likedBooks });

    assert.strictEqual(result.length, 2);
    assert.strictEqual(result[0].book_id, 1);
    assert.strictEqual(result[0].is_liked, true);
    assert.strictEqual(result[1].book_id, 2);
    assert.strictEqual(result[1].is_liked, false);
  });
});
