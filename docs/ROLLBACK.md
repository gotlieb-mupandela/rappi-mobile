# Rollback

Tag `pre-parity-2026-10-26` marks main at commit `628f68c16dffa780524a1b7b686d806c8e87e7eb`. The tag records that snapshot. It does not build or publish anything.

If the tag is missing locally, recreate it on that commit:

```sh
git tag pre-parity-2026-10-26 628f68c16dffa780524a1b7b686d806c8e87e7eb
```

`git push origin pre-parity-2026-10-26` uploads the marker only. It does not publish a build or an update.

The website-parity work will change how the app gets pictures, prices, labels, menus, and tiles, by moving those to `/api/mobile/storefront` and the web API, and it will remove the EUR display. Three flags below are the runtime switches for that work. All three default off. Off is today's behaviour.

Nothing in the running app reads these flags yet, so this change does not hide EUR and does not move menus, tiles, photos, labels, or card images. The parity change must call `isOn` from `src/lib/flags.ts` when it lands. Until then, setting a flag has no effect on screens.

## Flags

| Flag | Environment variable | Default | Off means |
| --- | --- | --- | --- |
| `PARITY_STOREFRONT` | `EXPO_PUBLIC_PARITY_STOREFRONT` | off | Menus, tiles, photos, and labels stay on the hardcoded lists. |
| `PARITY_CARD_IMAGE` | `EXPO_PUBLIC_PARITY_CARD_IMAGE` | off | Product cards keep using `product.imageUrl`. |
| `HIDE_EUR_MARKET` | `EXPO_PUBLIC_HIDE_EUR_MARKET` | off | The EUR display market stays available next to N$. |

`app.config.ts` copies each variable into `extra.flags` when Expo evaluates the config. `src/lib/flags.ts` reads `extra.flags` once at startup. A direct `EXPO_PUBLIC_` value in the bundle overrides `extra` for that flag. After startup the three booleans are frozen. A URL, deep link, push payload, API response, or typed input cannot change them.

Only these values turn a flag on: `1`, `true`, `on`, `yes` (any letter case, surrounding spaces ignored), or boolean `true` in `extra`. Every other value is off, including a missing value, `0`, `false`, and unknown text such as `maybe`. An unknown environment value does not fall through to `extra`. It stays off.

`HIDE_EUR_MARKET` is not connected to the market picker in this change. EUR is chosen in Settings and Account, and it also affects prices, language, and checkout, so there is no single safe edit in `src/i18n/market.ts`. Leave that wiring to the parity change, and have it check `isOn('HIDE_EUR_MARKET')`.

`eas.json` does not set these variables. A build or update that does not set them keeps every flag off.

## Turn each flag off for a build

Set the variable to `0` or `false` for the build. Unset also stays off, but set `0` when an EAS environment or a profile `env` block might still hold `true`.

One flag:

```sh
EXPO_PUBLIC_PARITY_STOREFRONT=0 eas build --platform android --profile production
```

```sh
EXPO_PUBLIC_PARITY_CARD_IMAGE=0 eas build --platform android --profile production
```

```sh
EXPO_PUBLIC_HIDE_EUR_MARKET=0 eas build --platform android --profile production
```

All three:

```sh
EXPO_PUBLIC_PARITY_STOREFRONT=0 EXPO_PUBLIC_PARITY_CARD_IMAGE=0 EXPO_PUBLIC_HIDE_EUR_MARKET=0 eas build --platform android --profile production
```

Use the platform and profile you actually ship. You can put the same `0` values in the matching `env` block in `eas.json`, or in the EAS environment that profile uses. Then run the build as usual.

## Turn each flag off for an over-the-air update

An EAS Update bundles JavaScript again and publishes the Expo config with it. Set the same variables to `0` in the shell (or in the EAS environment you pass with `--environment`) and publish:

```sh
EXPO_PUBLIC_PARITY_STOREFRONT=0 EXPO_PUBLIC_PARITY_CARD_IMAGE=0 EXPO_PUBLIC_HIDE_EUR_MARKET=0 eas update --branch production --message "Turn parity flags off"
```

To turn one flag off, set only that variable to `0` and leave the others unset (or set them to whatever you intend to ship). Replace `production` with the branch the installed app tracks. Devices receive the update on their next check. This does not rebuild the native binary.

## Revert the parity pull request after it merges

If the parity work landed on main as a merge commit, this one command undoes that merge. Parent 1 is main:

```sh
git revert -m 1 <parity-merge-commit>
```

Replace `<parity-merge-commit>` with the merge commit SHA. The command creates a local revert commit. It does not push or deploy. If the pull request was squash-merged, there is no merge parent: use `git revert <squash-commit>` with no `-m`.

Tag-based alternative. This one command creates a branch whose tree is the tagged snapshot (main before the parity work). It drops every commit after the tag, not only the parity merge, and it publishes nothing:

```sh
git checkout -B restore-pre-parity pre-parity-2026-10-26
```

Ship `restore-pre-parity` through a pull request if later commits should be discarded. To put that same tree onto main as a new commit without rewriting history:

```sh
git checkout main
git restore --source pre-parity-2026-10-26 --worktree --staged .
git commit -m "Restore the pre-parity snapshot"
```

## Roll back an EAS Update by republishing the previous one

Use this when a bad update is already published. Republishing does not create a new native build and does not need account ids in the command.

List recent updates and copy the group id of the last good update:

```sh
eas update:list --branch production --limit 10
```

Republish that group. Expo stores a new update whose bundle matches the good one, and clients that check for updates get it because it is newest:

```sh
eas update:republish --group <previous-update-group-id>
```

The interactive form of the same rollback is `eas update:rollback`. Choose the previous published update when asked.

People who already downloaded the bad update keep running it until the app downloads the republished one. If a new update crashes on launch, `expo-updates` can also roll back to the previous update on its own.

To send devices back to the JavaScript embedded in the installed build instead:

```sh
eas update:roll-back-to-embedded --branch production
```

Replace `production` with the branch you published to.

## What this fallback covers

With all three flags off:

- Menus, tiles, photos, and labels stay on the hardcoded lists, not `/api/mobile/storefront` or the web API (`PARITY_STOREFRONT`).
- Product card images stay on `product.imageUrl`, not the image field chosen by the API (`PARITY_CARD_IMAGE`).
- The EUR display market stays visible, so N$ and the EUR display both remain (`HIDE_EUR_MARKET`).

Turning the flags off is the runtime switch once the parity code reads them. `git revert -m 1 <parity-merge-commit>` is the one-step undo of that pull request after it merges. Tag `pre-parity-2026-10-26` (commit `628f68c16dffa780524a1b7b686d806c8e87e7eb`) is the full source snapshot from before that work, including pictures, prices, labels, menus, tiles, and the EUR display. Republishing the previous EAS Update restores the last good JavaScript bundle without a new binary.
