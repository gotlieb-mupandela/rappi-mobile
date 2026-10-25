# Android releases

Android builds are manual. A push to `main` does not start a build, and it does not change the remote Android version code.

## Dispatch a build

1. Open the Actions tab.
2. Choose **Android build**.
3. Choose **Run workflow**.
4. Pick the branch, then pick `profile`.

`profile` is required. The choices are `preview` and `production`. The default is `preview`.

### Preview

You can dispatch `preview` from any branch. The preview job does not use a GitHub environment. It runs `eas build --platform android --profile preview`. The preview profile in `eas.json` builds an internal APK and does not set `autoIncrement`, so it does not bump the remote Android version code.

### Production

Dispatch `production` from `main` only. If the selected ref is not `refs/heads/main`, the workflow stops before it starts a build and prints the ref it refused.

The production job uses the GitHub environment named `production`. The production profile in `eas.json` sets `autoIncrement` to true, and `cli.appVersionSource` is `remote`. Each production build increments the Android version code stored by EAS for this project.

## Repository settings

This file does not create environments or change secrets. Before the first production dispatch, the repo owner does this in GitHub:

- [ ] Move `EXPO_TOKEN` into the `production` environment's own secrets, then delete the repository-level copy.
- [ ] On the `production` environment, set required reviewers and set deployment branches to `main` only.
- [ ] If preview builds are wanted, use a separate environment with a separate limited Expo token. Do not reuse the production token.

Without this, anyone with write access can run an edited workflow from their own branch and read a repository-level secret. An environment secret is available only to a job that names that environment, and only after that environment's rules pass. The preview job in this workflow does not name an environment, so a preview token stored on an environment is not visible to it until the job is pointed at that environment.

## Rollback

Rollback is a one-step re-run of the previous build. Open the last good **Android build** run and choose **Re-run all jobs**. That rebuilds the same commit with the same profile.

A production re-run still increments the remote version code, because the production profile auto-increments. The new artifact is the previous source with a new version code.

## Play Console

This workflow does not submit to Google Play. It does not run `eas submit`. Uploading a bundle and rolling it out stay in Play Console.
