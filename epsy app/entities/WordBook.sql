{
  "name": "WordBookmark",
  "type": "object",
  "properties": {
    "word": {
      "type": "string",
      "description": "Word/phrase they don't understand"
    },
    "context": {
      "type": "string",
      "description": "Where they saw it (optional)"
    },
    "subject": {
      "type": "string",
      "description": "Which subject (optional)"
    },
    "notes": {
      "type": "string",
      "description": "Personal notes about this word"
    }
  },
  "required": [
    "word"
  ],
  "rls": {
    "create": {
      "created_by": "{{user.email}}"
    },
    "read": {
      "created_by": "{{user.email}}"
    },
    "update": {
      "created_by": "{{user.email}}"
    },
    "delete": {
      "created_by": "{{user.email}}"
    },
    "write": {
      "created_by": "{{user.email}}"
    },
    "admin_read": false,
    "admin_write": false
  }
}