{
  "name": "StudentCredential",
  "type": "object",
  "properties": {
    "school_id": {
      "type": "string",
      "description": "School this credential belongs to"
    },
    "username": {
      "type": "string",
      "description": "System-generated username"
    },
    "pin_hash": {
      "type": "string",
      "description": "Hashed PIN for authentication"
    },
    "status": {
      "type": "string",
      "enum": [
        "unused",
        "active",
        "disabled"
      ],
      "default": "unused"
    },
    "grade": {
      "type": "string",
      "description": "Student grade level (optional)"
    },
    "last_login_at": {
      "type": "string",
      "format": "date-time",
      "description": "Last successful login timestamp"
    },
    "linked_user_id": {
      "type": "string",
      "description": "User ID after first login"
    }
  },
  "required": [
    "school_id",
    "username",
    "pin_hash"
  ],
  "rls": {
    "create": {
      "user_condition": {
        "role": "school_admin"
      }
    },
    "read": {
      "user_condition": {
        "role": "school_admin"
      }
    },
    "update": {
      "user_condition": {
        "role": "school_admin"
      }
    },
    "delete": {
      "user_condition": {
        "role": "school_admin"
      }
    },
    "write": {
      "user_condition": {
        "role": "school_admin"
      }
    }
  }
}