# Testing Clearly on your phone

Everything below has been checked in a browser except the parts marked **phone only**. Notifications, haptics-feel and real-world readability can only be judged on a device.

## Get it running in Expo Go

1. Install **Expo Go** from the App Store or Google Play. It needs to support SDK 58.
2. On your computer, in the `clearly` folder:
   ```bash
   npm install
   npm start
   ```
3. Scan the QR code: on iPhone with the Camera app, on Android from inside Expo Go.
4. If the phone can't connect (different Wi-Fi, work network or VPN), stop it and run `npx expo start --tunnel` instead.

To start completely fresh later, delete Expo Go's data for the app (or uninstall and reinstall Expo Go).

## Checklist

### First run
- [ ] Opens on "Let's meet your pool". Volume calculator works and "Use this" fills the volume.
- [ ] Save takes you to Home: "Let's see how your water's going", water low in the tank.

### Test screen
- [ ] **Phone only:** tapping − and + steps once per tap; holding repeats at a comfortable speed.
- [ ] Tapping the number brings up the number pad; typed values stick.
- [ ] Coloured bands and messages update as you change values.
- [ ] Save shows a quick ripple, then the plan.
- [ ] **Phone only:** after the first save, the phone asks to allow notifications. Say yes.

### Plan and dose follow-ups (phone only)
Use readings that give an acid step then chlorine, e.g. FC 1, pH 7.9, TA 80, CYA 40.
- [ ] Tick the acid step. The screen says "We'll remind you at ...".
- [ ] To test quickly, set quiet hours so they don't cover the next few hours, and check the reminder arrives when the wait ends (4 hours, or 6 pm if earlier in the day for chlorine).
- [ ] Undo the tick: the reminder should be cancelled.
- [ ] Ticking everything shows the splash and "Clearly sorted".

### Home
- [ ] Wave rises and settles, briefly, with no bounce.
- [ ] **Phone only:** with Reduce Motion on (iOS: Accessibility > Motion; Android: Remove animations), the wave just appears at its level.
- [ ] The big button always matches the one next thing to do.

### Settings
- [ ] Sun mode: take it outside in bright sun. Is everything readable? Anything washed out?
- [ ] Turn a reminder off and on; the phone shouldn't ask for permission again if already allowed.
- [ ] **Phone only:** with notifications blocked in the phone's settings, Settings shows the warning. Allow them again and come back: the warning goes.

### Test reminders (phone only, takes a few days)
- [ ] A test reminder arrives on the next scheduled day (Wednesday or Saturday by default, 6 pm), but not the day of or after a test.
- [ ] Nothing arrives during quiet hours.

## Reporting back
For anything odd, note the screen, what you tapped, what you expected and what happened. A screenshot helps.
