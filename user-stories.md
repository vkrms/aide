# User Stories

## US-1: Plain-language relative time reminders

**As a** user  
**I want to** send a message like "remind me in 45 minutes to take a break"  
**So that** I get a reminder at the correct time without doing math

### Acceptance Criteria
- [ ] `replyToMessage` returns a `scheduleReminder` function call with a correct UTC ISO 8601 `scheduledAt`
- [ ] The reminder is scheduled via `scheduleReminder` and a `POST /api/send-reminder` delivers it at the right time
- [ ] The user receives a Telegram message at the scheduled time with the reminder text
- [ ] Timezone (Asia/Bangkok) is respected: "in 45 minutes" resolves to 45 minutes from now in the user's local timezone
