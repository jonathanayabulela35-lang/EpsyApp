{
  "name": "QuestionTemplate",
  "type": "object",
  "properties": {
    "subject": {
      "type": "string",
      "description": "Subject this template is for"
    },
    "category": {
      "type": "string",
      "description": "Type of template (confusion-identifier, refinement, etc.)"
    },
    "template_text": {
      "type": "string",
      "description": "The template with placeholders"
    },
    "guidance": {
      "type": "string",
      "description": "How to use this template"
    },
    "weak_example": {
      "type": "string",
      "description": "Example of a weak question"
    },
    "strong_example": {
      "type": "string",
      "description": "Example of a strong question"
    },
    "published": {
      "type": "boolean",
      "default": false
    },
    "order": {
      "type": "number"
    }
  },
  "required": [
    "subject",
    "category",
    "template_text"
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