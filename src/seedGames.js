// seedGames.js
// One-time seed data: the 4 games logged during prototyping.
// The app loads these ONLY when device storage is empty (first launch),
// so they appear once and then live as normal editable games.
//
// Net zone index: 0 TopL 1 TopM 2 TopR / 3 MidL 4 Center 5 MidR / 6 LowL 7 LowM 8 LowR
// Field dest index: 0 LeftWing 1 UpMiddle 2 RightWing / 3 LeftSide 4 Midfield 5 RightSide

export const SEED_GAMES = [
  {
    "id": "g_grizzly_20260613",
    "name": "Grizzly upstate",
    "playerId": "p_vincent",
    "date": "2026-06-13T19:39:00",
    "shots": [
      {
        "zone": 0,
        "result": "goal",
        "t": "2026-06-13T19:00:00"
      },
      {
        "zone": 2,
        "result": "goal",
        "t": "2026-06-13T19:00:30"
      },
      {
        "zone": 4,
        "result": "save",
        "t": "2026-06-13T19:01:00"
      },
      {
        "zone": 5,
        "result": "save",
        "t": "2026-06-13T19:01:30"
      },
      {
        "zone": 7,
        "result": "save",
        "t": "2026-06-13T19:02:00"
      },
      {
        "zone": 7,
        "result": "save",
        "t": "2026-06-13T19:02:30"
      },
      {
        "zone": 7,
        "result": "save",
        "t": "2026-06-13T19:03:00"
      }
    ],
    "clears": [
      {
        "dest": 1,
        "result": "success",
        "t": "2026-06-13T19:03:30"
      },
      {
        "dest": 2,
        "result": "success",
        "t": "2026-06-13T19:04:00"
      },
      {
        "dest": 4,
        "result": "success",
        "t": "2026-06-13T19:04:30"
      }
    ]
  },
  {
    "id": "g_20260614_1005",
    "name": "True Westchester",
    "playerId": "p_vincent",
    "date": "2026-06-14T10:05:00",
    "shots": [
      {
        "zone": 0,
        "result": "goal",
        "t": "2026-06-14T09:00:00"
      },
      {
        "zone": 1,
        "result": "save",
        "t": "2026-06-14T09:00:30"
      },
      {
        "zone": 2,
        "result": "goal",
        "t": "2026-06-14T09:01:00"
      },
      {
        "zone": 5,
        "result": "goal",
        "t": "2026-06-14T09:01:30"
      },
      {
        "zone": 6,
        "result": "save",
        "t": "2026-06-14T09:02:00"
      },
      {
        "zone": 8,
        "result": "save",
        "t": "2026-06-14T09:02:30"
      }
    ],
    "clears": [
      {
        "dest": 0,
        "result": "success",
        "t": "2026-06-14T09:03:00"
      },
      {
        "dest": 4,
        "result": "success",
        "t": "2026-06-14T09:03:30"
      }
    ]
  },
  {
    "id": "g_titan_20260613",
    "name": "Brotherly Love Titan",
    "playerId": "p_vincent",
    "date": "2026-06-13T17:37:00",
    "shots": [
      {
        "zone": 2,
        "result": "goal",
        "t": "2026-06-13T17:00:00"
      },
      {
        "zone": 3,
        "result": "save",
        "t": "2026-06-13T17:00:30"
      },
      {
        "zone": 3,
        "result": "save",
        "t": "2026-06-13T17:01:00"
      },
      {
        "zone": 5,
        "result": "goal",
        "t": "2026-06-13T17:01:30"
      },
      {
        "zone": 5,
        "result": "goal",
        "t": "2026-06-13T17:02:00"
      },
      {
        "zone": 6,
        "result": "goal",
        "t": "2026-06-13T17:02:30"
      },
      {
        "zone": 7,
        "result": "save",
        "t": "2026-06-13T17:03:00"
      },
      {
        "zone": 7,
        "result": "save",
        "t": "2026-06-13T17:03:30"
      },
      {
        "zone": 7,
        "result": "save",
        "t": "2026-06-13T17:04:00"
      },
      {
        "zone": 7,
        "result": "save",
        "t": "2026-06-13T17:04:30"
      }
    ],
    "clears": [
      {
        "dest": 1,
        "result": "success",
        "t": "2026-06-13T17:05:00"
      },
      {
        "dest": 5,
        "result": "success",
        "t": "2026-06-13T17:05:30"
      },
      {
        "dest": 5,
        "result": "success",
        "t": "2026-06-13T17:06:00"
      },
      {
        "dest": 5,
        "result": "success",
        "t": "2026-06-13T17:06:30"
      },
      {
        "dest": 2,
        "result": "fail",
        "t": "2026-06-13T17:07:00"
      }
    ]
  },
  {
    "id": "g_recovered_20260612",
    "name": "Team Maryland",
    "playerId": "p_vincent",
    "date": "2026-06-12T15:53:00",
    "shots": [
      {
        "zone": 0,
        "result": "save",
        "t": "2026-06-12T15:00:00"
      },
      {
        "zone": 0,
        "result": "save",
        "t": "2026-06-12T15:00:30"
      },
      {
        "zone": 0,
        "result": "goal",
        "t": "2026-06-12T15:01:00"
      },
      {
        "zone": 2,
        "result": "save",
        "t": "2026-06-12T15:01:30"
      },
      {
        "zone": 3,
        "result": "save",
        "t": "2026-06-12T15:02:00"
      },
      {
        "zone": 3,
        "result": "save",
        "t": "2026-06-12T15:02:30"
      },
      {
        "zone": 3,
        "result": "save",
        "t": "2026-06-12T15:03:00"
      },
      {
        "zone": 3,
        "result": "goal",
        "t": "2026-06-12T15:03:30"
      },
      {
        "zone": 4,
        "result": "save",
        "t": "2026-06-12T15:04:00"
      },
      {
        "zone": 5,
        "result": "save",
        "t": "2026-06-12T15:04:30"
      },
      {
        "zone": 6,
        "result": "save",
        "t": "2026-06-12T15:05:00"
      },
      {
        "zone": 6,
        "result": "save",
        "t": "2026-06-12T15:05:30"
      },
      {
        "zone": 6,
        "result": "goal",
        "t": "2026-06-12T15:06:00"
      },
      {
        "zone": 7,
        "result": "goal",
        "t": "2026-06-12T15:06:30"
      },
      {
        "zone": 7,
        "result": "goal",
        "t": "2026-06-12T15:07:00"
      },
      {
        "zone": 8,
        "result": "goal",
        "t": "2026-06-12T15:07:30"
      }
    ],
    "clears": [
      {
        "dest": 4,
        "result": "success",
        "t": "2026-06-12T15:08:00"
      },
      {
        "dest": 4,
        "result": "success",
        "t": "2026-06-12T15:08:30"
      },
      {
        "dest": 4,
        "result": "success",
        "t": "2026-06-12T15:09:00"
      },
      {
        "dest": 4,
        "result": "success",
        "t": "2026-06-12T15:09:30"
      },
      {
        "dest": 4,
        "result": "success",
        "t": "2026-06-12T15:10:00"
      },
      {
        "dest": 4,
        "result": "fail",
        "t": "2026-06-12T15:10:30"
      }
    ]
  }
];
