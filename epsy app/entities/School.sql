{
  "name": "School",
  "type": "object",
  "properties": {
    "name": {
      "type": "string",
      "description": "School name"
    },
    "school_code": {
      "type": "string",
      "description": "Unique school code for username generation"
    },
    "seat_limit": {
      "type": "number",
      "description": "Maximum number of student accounts",
      "default": 0
    },
    "seats_generated": {
      "type": "number",
      "description": "Number of student credentials generated",
      "default": 0
    },
    "status": {
      "type": "string",
      "enum": [
        "active",
        "inactive"
      ],
      "default": "active"
    }
  },
  "required": [
    "name",
    "school_code"
  ],
  "rls": {
    "create": {
      "user_condition": {
        "role": "admin"
      }
    },
    "read": true,
    "update": {
      "user_condition": {
        "role": "admin"
      }
    },
    "delete": {
      "user_condition": {
        "role": "admin"
      }
    },
    "write": {
      "user_condition": {
        "role": "admin"
      }
    }
  }
}