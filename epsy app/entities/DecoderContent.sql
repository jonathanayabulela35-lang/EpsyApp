{
  "name": "DecoderContent",
  "type": "object",
  "properties": {
    "subject": {
      "type": "string",
      "description": "Subject name (Maths, Economics, etc.)"
    },
    "instruction_words": {
      "type": "array",
      "description": "List of instruction word explanations",
      "items": {
        "type": "object",
        "properties": {
          "word": {
            "type": "string"
          },
          "meaning": {
            "type": "string"
          },
          "what_required": {
            "type": "string"
          },
          "example": {
            "type": "string"
          }
        }
      }
    },
    "question_structure": {
      "type": "string",
      "description": "How questions are framed in this subject"
    },
    "how_to_respond": {
      "type": "string",
      "description": "How to structure answers based on instruction words"
    },
    "how_to_remember": {
      "type": "string",
      "description": "Memory cues and frameworks for recall"
    },
    "common_traps": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "What to watch out for"
    },
    "watch_for": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "Key things to always notice"
    },
    "past_paper_examples": {
      "type": "array",
      "description": "Real question breakdowns",
      "items": {
        "type": "object",
        "properties": {
          "question": {
            "type": "string"
          },
          "breakdown": {
            "type": "string"
          }
        }
      }
    },
    "published": {
      "type": "boolean",
      "default": false
    }
  },
  "required": [
    "subject"
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