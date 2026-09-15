/* RALLY — preview configuration (safe to publish, NULL in git).

   The normal RALLY path never sets this: window.RALLY_PREVIEW stays null and
   every module below behaves exactly as it always has. The ISOLATED PREVIEW
   build (rally/tools/build-preview.sh) overwrites this one file at publish
   time so that a copy of the app served beside production on the same
   origin shares NOTHING with it:

     db        its own IndexedDB database name (IndexedDB is per-origin, so
               without this the preview would open production's book)
     cache     its own service-worker cache family (Cache Storage is
               per-origin too — see sw.js, which only ever deletes its own)
     isolated  the cloud bridge is forced OFF regardless of cloud-config.js,
               so no request, no session and no sync can reach the team
               server; the device is the record
     demo      the first boot seeds a clearly-named demo team instead of the
               usual "Me"; every house, knock and territory a tester creates
               stays in the preview's own database
     label     the ribbon every screen wears so nobody mistakes it for RALLY

   This is a TESTING shape only. It is not a tenancy model, not a second
   company, and not a way to run two teams on one phone. */
window.RALLY_PREVIEW = window.RALLY_PREVIEW || null;
