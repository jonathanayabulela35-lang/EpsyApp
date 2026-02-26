{
  "name": "StudentProgress",
  "type": "object",
  "properties": {
    "challenge_id": {
      "type": "string",
      "description": "Which challenge they're working on"
    },
    "code_name": {
      "type": "string",
      "description": "Privacy code name for this challenge"
    },
    "current_day": {
      "type": "number",
      "description": "Which day they're on"
    },
    "completed_days": {
      "type": "array",
      "items": {
        "type": "number"
      },
      "description": "Days completed"
    },
    "started_date": {
      "type": "string"
    },
    "last_accessed": {
      "type": "string"
    },
    "personal_notes": {
      "type": "string",
      "description": "Private growth log"
    }
  },
  "required": [
    "challenge_id"
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