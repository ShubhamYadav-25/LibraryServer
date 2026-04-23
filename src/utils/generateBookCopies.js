export function generateBookCopies(p_book_id, p_num_copies, p_start_num = 1) {
  const result = [];

  // Format book_id to B00X (e.g., 1 -> B001)
  const formatted_book_id = `B${String(p_book_id).padStart(3, '0')}`;

  for (let i = 0; i < p_num_copies; i++) {
    const current_suffix = p_start_num + i;

    // Create ID string: B001-C1
    const new_copy_id = `${formatted_book_id}-C${current_suffix}`;

    result.push([
        p_book_id,
        new_copy_id,
    ]);
  }

  return result;
}