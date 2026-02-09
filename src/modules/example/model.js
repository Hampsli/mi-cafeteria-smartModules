import { query } from '../../config/database.js';

/**
 * Example Module - Database operations.
 */

export async function findAll() {
  const { rows } = await query(
    'SELECT * FROM example_items ORDER BY created_at DESC'
  );
  return rows;
}

export async function findById(id) {
  const { rows } = await query(
    'SELECT * FROM example_items WHERE id = $1',
    [id]
  );
  return rows[0] || null;
}

export async function create(data) {
  const { rows } = await query(
    `INSERT INTO example_items (name, description, status, metadata)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [data.name, data.description || '', data.status || 'active', JSON.stringify(data.metadata || {})]
  );
  return rows[0];
}

export async function update(id, data) {
  const fields = [];
  const values = [];
  let paramIndex = 1;

  if (data.name !== undefined) {
    fields.push(`name = $${paramIndex++}`);
    values.push(data.name);
  }
  if (data.description !== undefined) {
    fields.push(`description = $${paramIndex++}`);
    values.push(data.description);
  }
  if (data.status !== undefined) {
    fields.push(`status = $${paramIndex++}`);
    values.push(data.status);
  }
  if (data.metadata !== undefined) {
    fields.push(`metadata = $${paramIndex++}`);
    values.push(JSON.stringify(data.metadata));
  }

  if (fields.length === 0) return findById(id);

  fields.push(`updated_at = NOW()`);
  values.push(id);

  const { rows } = await query(
    `UPDATE example_items SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    values
  );
  return rows[0] || null;
}

export async function remove(id) {
  const { rowCount } = await query(
    'DELETE FROM example_items WHERE id = $1',
    [id]
  );
  return rowCount > 0;
}

export default { findAll, findById, create, update, remove };
