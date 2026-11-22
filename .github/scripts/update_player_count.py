"""Write Fin City's all-time user count from Google Analytics into the site.

fin-city.html has the main counter (#playerCount). Every other page that shows the count marks it with
<span data-count="N" data-fc-players>N</span>, and those are updated too.

Run daily by .github/workflows/fin-city-players.yml. Needs two environment variables:
  GA_CREDENTIALS  the service account's JSON key (a GitHub secret)
  GA_PROPERTY_ID  the Fin City GA4 property id
"""
import json
import os
import re
import sys

from google.analytics.data_v1beta import BetaAnalyticsDataClient
from google.analytics.data_v1beta.types import DateRange, Metric, RunReportRequest

PAGE = "fin-city.html"
PATTERN = re.compile(r'(id="playerCount" data-count=")(\d+)(">)([\d,]+)(<)')

client = BetaAnalyticsDataClient.from_service_account_info(json.loads(os.environ["GA_CREDENTIALS"]))
report = client.run_report(RunReportRequest(
    property=f"properties/{os.environ['GA_PROPERTY_ID']}",
    metrics=[Metric(name="totalUsers")],
    date_ranges=[DateRange(start_date="2015-08-14", end_date="today")],
))
users = int(report.rows[0].metric_values[0].value) if report.rows else 0

html = open(PAGE, encoding="utf-8").read()
match = PATTERN.search(html)
if not match:
    sys.exit("Could not find the player counter in " + PAGE)
old = int(match.group(2))

# Guard against a bad read (an API hiccup or a wrong property) wiping out the number.
if users <= 0 or users < old * 0.9:
    sys.exit(f"Refusing to change the count from {old} to {users}")

html = PATTERN.sub(lambda m: f"{m.group(1)}{users}{m.group(3)}{users:,}{m.group(5)}", html, count=1)
open(PAGE, "w", encoding="utf-8").write(html)

# The impact numbers on the home, About and Donate pages
MARKED = re.compile(r'(<span data-count=")(\d+)(" data-fc-players>)([\d,]+)(<)')
for page in ("index.html", "about.html", "donate.html"):
    text = open(page, encoding="utf-8").read()
    text, n = MARKED.subn(lambda m: f"{m.group(1)}{users}{m.group(3)}{users:,}{m.group(5)}", text)
    if n:
        open(page, "w", encoding="utf-8").write(text)

print(f"Fin City players: {old} -> {users}")
