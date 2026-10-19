==============================================================================
                    ZAMZAM FOODS — FULL KIT DEPLOYMENT
       Enterprise Wholesale Billing & Daily Route Dispatch System
==============================================================================

DEFAULT MASTER LOGIN ACCOUNTS:
  • Master Admin:
      Username: admin
      Password: zamzam@2026
  • Owner Account:
      Username: shiyas
      Password: zamzam@2026
  • Drivers:
      Usernames: driver_f, driver_a, driver_s
      Password : zamzam@2026

------------------------------------------------------------------------------
WINDOWS AUTO-START SETUP (RUN BACKEND 24/7 WHENEVER PC IS ON):
------------------------------------------------------------------------------
Step 1: Double-click "enable_autostart_windows.bat"
        - Automatically registers Zamzam Backend into Windows Startup & Registry.
        - Starts the backend SILENTLY in the background right now.
        - From now on, whenever you turn ON your PC, the backend starts automatically!
        - Whenever you turn OFF your PC, it safely powers off.
        - Zero black terminal windows! Completely silent in the background.

Step 2: Double-click "start_zamzam_all.bat" or the "Zamzam Foods" desktop shortcut
        - Opens the Zamzam Foods Desktop application.
        - It connects immediately in 0ms without any connection errors!

To Stop the Backend manually:
  • Double-click "stop_backend_windows.bat"

To Turn Off Auto-Start:
  • Double-click "disable_autostart_windows.bat"

------------------------------------------------------------------------------
macOS INSTRUCTIONS:
------------------------------------------------------------------------------
Step 1: Start the backend:
        Open Terminal in this folder and run:
        .venv/bin/python backend/manage.py runserver 127.0.0.1:8000

Step 2: Launch "Zamzam Foods" from Applications (or open http://127.0.0.1:8000/ in browser).

Step 3 (Optional - Auto-Start on Mac Boot):
        Run "./enable_autostart_mac.sh" in Terminal.
        To remove auto-start later, run "./disable_autostart_mac.sh".

==============================================================================
Support / Verification:
  Backend URL : http://127.0.0.1:8000/api/v1/
  Health Check: http://127.0.0.1:8000/api/health/
==============================================================================
