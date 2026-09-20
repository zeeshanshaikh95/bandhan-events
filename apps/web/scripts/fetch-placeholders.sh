#!/usr/bin/env bash
# Downloads curated placeholder photography (Unsplash license) into public/images.
# TODO: Replace with actual Bandhan Events photography.
set -u
mkdir -p public/images
# slot|unsplash-photo-id
pairs=(
"hero|1519167758481-83f550bb49b3"
"decor-stage|1470229722913-7c0e2dbbafd3"
"decor-arch|1465495976277-4387d4b0b4c6"
"decor-floral|1490750967868-88aa4486c946"
"decor-table|1464366400600-7168b8af9bc3"
"decor-setting|1522673607200-164d1b6ce486"
"decor-ceremony|1469371670807-013ccf25f16a"
"decor-bouquet|1523438885200-e635ba2c371e"
"decor-outdoor|1510076857177-7470076d4098"
"couple-1|1519741497674-611481863552"
"couple-2|1478146896981-b80fe463b330"
"couple-3|1515934751635-c81c6bc9a2d8"
"couple-indian|1583939003579-730e3918a45a"
"dining-1|1414235077428-338989a2e8c0"
"dining-2|1517248135467-4c7edcad34c4"
"dining-3|1511795409834-ef04bbd61622"
"dining-4|1513519245088-0e12902e35ca"
"chef-1|1555244162-803834f70033"
"banquet-1|1532712938310-34cb3982ef74"
"banquet-2|1519225421980-715cb0215aed"
"celebration-1|1492684223066-81342ee5ff30"
"celebration-2|1529636798458-92182e662485"
"corporate-1|1511578314322-379afb476865"
"corporate-2|1540575467063-178a50c2df87"
"corporate-3|1505373877841-8d25f7d46678"
"corporate-4|1497366216548-37526070297c"
"gift-1|1549465220-1a8b9238cd48"
"gift-2|1513201099705-a9746e1e201f"
"gift-3|1512909006721-3d6018887383"
"candle-1|1596436889106-be35e843f974"
"light-1|1519671482749-fd09be7ccebf"
"flowers-2|1526047932273-341f2a7631f9"
"flowers-3|1487530811176-3780de880c2d"
)
ok=0; fail=""
for pair in "${pairs[@]}"; do
  slot="${pair%%|*}"; id="${pair##*|}"
  out="public/images/${slot}.webp"
  url="https://images.unsplash.com/photo-${id}?q=72&w=1600&auto=format&fit=crop"
  if curl -fsSL --max-time 40 -o "$out" "$url"; then
    size=$(wc -c < "$out")
    if [ "$size" -gt 12000 ]; then
      ok=$((ok+1))
    else
      rm -f "$out"; fail="$fail ${slot}(tiny)"
    fi
  else
    rm -f "$out"; fail="$fail ${slot}(404)"
  fi
  sleep 0.3
done
echo "OK: $ok / ${#pairs[@]}"
echo "FAILED:$fail"
