export const attachLikedFlag = (books, liked) => {
  const likedSet = new Set(liked.map(l => l.book_id));

  return books.map(b => ({
    ...b,
    is_liked: likedSet.has(b.book_id),
  }));
};

