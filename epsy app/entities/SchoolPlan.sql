{
  "name": "SchoolPlan",
  "type": "object",
  "properties": {
    "school_name": {
      "type": "string",
      "description": "School name"
    },
    "plan_type": {
      "type": "string",
      "enum": [
        "monthly",
        "annual"
      ],
      "default": "monthly"
    },
    "student_limit": {
      "type": "number",
      "description": "Maximum number of students"
    },
    "next_billing_date": {
      "type": "string",
      "format": "date"
    },
    "payment_method_last4": {
      "type": "string",
      "description": "Last 4 digits of payment method"
    },
    "status": {
      "type": "string",
      "enum": [
        "active",
        "expiring_soon",
        "inactive"
      ],
      "default": "active"
    }
  },
  "required": [
    "school_name"
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