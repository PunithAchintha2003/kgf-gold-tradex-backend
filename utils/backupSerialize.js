/**
 * JSON-safe serialization for MongoDB backup exports.
 */
export function serializeForBackup(data) {
  return JSON.parse(
    JSON.stringify(data, (_key, value) => {
      if (value && typeof value === 'object') {
        if (value._bsontype === 'ObjectId' || value.constructor?.name === 'ObjectId') {
          return value.toString();
        }
        if (value instanceof Date) {
          return value.toISOString();
        }
      }
      return value;
    })
  );
}

export function toBackupJson(data, indent = 2) {
  return JSON.stringify(serializeForBackup(data), null, indent);
}
