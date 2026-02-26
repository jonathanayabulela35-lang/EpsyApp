{
  "name": "ChallengeDay",
  "type": "object",
  "properties": {
    "challenge_id": {
      "type": "string",
      "description": "Parent challenge ID"
    },
    "day_number": {
      "type": "number",
      "description": "Day 1, 2, 3, etc."
    },
    "goal": {
      "type": "string",
      "description": "Simple explanation of the day's goal"
    },
    "daily_task": {
      "type": "string",
      "description": "Clear action for today"
    },
    "example": {
      "type": "string",
      "description": "Short practical example"
    },
    "deeper_explanation": {
      "type": "string",
      "description": "Optional collapsed detail"
    },
    "thought_offering": {
      "type": "string",
      "description": "Gentle daily reflection"
    }
  },
  "required": [
    "challenge_id",
    "day_number",
    "goal",
    "daily_task"
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