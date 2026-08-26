import { google } from 'googleapis'

export function createCalendarAuth(serviceJson: string) {
  const creds = JSON.parse(serviceJson)
  return new google.auth.JWT({
    email: creds.client_email,
    key: creds.private_key,
    scopes: ['https://www.googleapis.com/auth/calendar'],
  })
}
