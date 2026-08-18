/**
 * Sanitizes and formats recommendation candidate items for student-facing responses.
 * Strictly mirrors the public student projection used in bookRepository.getBooks()
 * and guarantees that no confidential/internal library fields (total_copy, issued_copy,
 * shelf_location, etc.) are exposed.
 */
export const formatRecommendationItem = ({ liveBook, score = 0, isLiked = false }) => {
  if (!liveBook || liveBook.book_id == null) return null;

  return {
    book_id: liveBook.book_id,
    title: liveBook.title ?? "",
    ISBN: liveBook.ISBN ?? "",
    image: liveBook.image ?? null,
    author: liveBook.author ?? "",
    genre: liveBook.genre ?? "",
    date: liveBook.date ?? null,
    status: liveBook.status ?? "Available",
    is_liked: Boolean(isLiked),
    score: Number(Number(score || 0).toFixed(6)),
  };
};

/**
 * Formats an array of ranked items by hydrating them with live database records
 * and student like statuses.
 */
export const formatRecommendationList = ({ ranked = [], liveBooks = [], likedBooks = [] }) => {
  const liveBookMap = new Map(liveBooks.map((book) => [String(book.book_id), book]));
  const likedBookSet = new Set(likedBooks.map((book) => String(book.book_id)));

  return ranked
    .map((item) => {
      const liveBook = liveBookMap.get(String(item.book_id));
      if (!liveBook) return null;

      return formatRecommendationItem({
        liveBook,
        score: item.score,
        isLiked: likedBookSet.has(String(item.book_id)),
      });
    })
    .filter(Boolean);
};
