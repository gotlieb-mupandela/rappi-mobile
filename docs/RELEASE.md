# Android releases

Android builds are manual. A push to `main` does not start a build, and it does not change the remote Android version code.

## Dispatch a build

1. Open the Actions tab.
2. Choose **Android build**.
3. Choose **Run workflow**.
4. Pick the branch, then pick `profile`.

`profile` is required. The choices are `preview` and `production`. The default is `preview`.

### Preview

You can dispatch `preview` from any branch. It runs `eas build --platform android --profile preview`. The preview profile in `eas.json` builds an internal APK and does not set `autoIncrement`, so it does not bump the remote Android version code.

### Production

Dispatch `production` from `main` only. If the selected ref is not `refs/heads/main`, the workflow stops before it starts a build and prints the ref it refused.

The production build job uses the GitHub environment named `production`. Create that environment and add required reviewers before the first production dispatch. This repository file does not create the environment.

The production profile in `eas.json` sets `autoIncrement` to true, and `cli.appVersionSource` is `remote`. Each production build increments the Android version code stored by EAS for this project.

## Rollback

Rollback is a one-step re-run of the previous build. Open the last good **Android build** run and choose **Re-run all jobs**. That rebuilds the same commit with the same profile.

A production re-run still increments the remote version code, because the production profile auto-increments. The new artifact is the previous source with a new version code.

## Play Console

This workflow does not submit to Google Play. It does not run `eas submit`. Uploading a bundle and rolling it out stay in Play Console.
