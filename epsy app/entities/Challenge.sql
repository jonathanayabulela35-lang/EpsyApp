{
  "name": "Challenge",
  "type": "object",
  "properties": {
    "title": {
      "type": "string",
      "description": "Challenge name (e.g., Bullying, Exam Anxiety)"
    },
    "slug": {
      "type": "string",
      "description": "URL-friendly version"
    },
    "icon": {
      "type": "string",
      "description": "Emoji icon for the challenge"
    },
    "why_this_happens": {
      "type": "string",
      "description": "Explanation of why this challenge occurs"
    },
    "how_to_reframe": {
      "type": "string",
      "description": "How to think differently about it"
    },
    "if_you_ignore": {
      "type": "string",
      "description": "What happens if you don't address it"
    },
    "if_you_act": {
      "type": "string",
      "description": "What happens when you take action"
    },
    "full_breakdown": {
      "type": "string",
      "description": "Optional deeper reading"
    },
    "thought_offering": {
      "type": "string",
      "description": "Gentle reflection prompt"
    },
    "execution_overview": {
      "type": "array",
      "description": "Visible process flow (Day 1 - Awareness, etc.)",
      "items": {
        "type": "object",
        "properties": {
          "day": {
            "type": "number"
          },
          "label": {
            "type": "string"
          }
        }
      }
    },
    "published": {
      "type": "boolean",
      "default": false,
      "description": "Whether students can see this"
    },
    "order": {
      "type": "number",
      "description": "Display order"
    }
  },
  "required": [
    "title",
    "slug"
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