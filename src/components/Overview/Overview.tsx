import { MeterList } from 'components/charts/MeterList';
import { RankedBars } from 'components/charts/RankedBars';
import { Card, StatTile } from 'components/charts/StatTile';
import { StatusTag } from 'components/charts/StatusTag';
import { type FC } from 'react';
import { formatPct, formatPremium } from 'utils/format';
import type { Overview as OverviewData, StoreComparison } from 'utils/insights';

import styles from './Overview.module.scss';

const ratio = (part: number, whole: number) => (whole ? part / whole : null);

export interface OverviewProps {
  overview: OverviewData;
  comparison: StoreComparison[];
}

export const Overview: FC<OverviewProps> = ({ overview: o, comparison }) => {
  const notPurchasable = o.availabilityChecked - o.purchasable;
  return (
    <div className={styles.Overview}>
      <div className={styles.kpis}>
        <StatTile
          label="Prices found"
          value={formatPct(ratio(o.priced, o.checked))}
          detail={`${o.priced} of ${o.checked} store × SKU checks`}
        />
        <StatTile
          label="Purchasable"
          value={formatPct(ratio(o.purchasable, o.availabilityChecked))}
          detail={
            notPurchasable > 0 ? (
              <StatusTag
                kind="warning"
                label={`${notPurchasable} listed but not purchasable`}
              />
            ) : (
              `${o.purchasable} of ${o.availabilityChecked} cart checks`
            )
          }
        />
        <StatTile
          label="SKUs × stores"
          value={`${o.skus} × ${o.stores.length}`}
          detail="in the latest run"
        />
        <StatTile
          label="Errors"
          value={String(o.errors)}
          detail={
            o.errors ? (
              <StatusTag
                kind="critical"
                label="blocked, timeouts or parse failures"
              />
            ) : (
              <StatusTag kind="good" label="every store answered" />
            )
          }
        />
      </div>

      <div className={styles.cards}>
        <Card
          title="Price position"
          subtitle="Average premium over the cheapest purchasable offer of the same SKU · shorter is cheaper"
        >
          <RankedBars
            label="Average premium over the cheapest offer, per store"
            items={comparison.map((s) => ({
              key: s.store,
              label: s.store,
              value: s.avgPremium,
              valueText:
                s.avgPremium == null ? '—' : formatPremium(s.avgPremium),
              detail: s.compared
                ? `Cheapest on ${s.wins} of ${s.compared} SKUs · ${formatPct(s.promoShare)} on promotion`
                : 'No SKU it shares with another store',
            }))}
          />
        </Card>

        <Card
          title="Coverage"
          subtitle="SKUs with a price in the latest run, per store"
        >
          <MeterList
            label="Prices found per store"
            items={o.stores.map((s) => {
              const blocked = s.availabilityChecked - s.purchasable;
              const reasons = s.topCodes
                .filter((c) => c.code !== 'NOT_PURCHASABLE')
                .slice(0, 3)
                .map((c) => `${c.code} ${c.count}`)
                .join(' · ');
              return {
                key: s.store,
                label: s.store,
                part: s.priced,
                whole: s.checked,
                valueText: `${s.priced}/${s.checked}`,
                extra:
                  s.errors || blocked || reasons ? (
                    <>
                      {s.errors > 0 && (
                        <StatusTag
                          kind="critical"
                          label={`${s.errors} errors`}
                        />
                      )}
                      {blocked > 0 && (
                        <StatusTag
                          kind="warning"
                          label={`${blocked} not purchasable`}
                        />
                      )}
                      {reasons && (
                        <span className={styles.reasons}>{reasons}</span>
                      )}
                    </>
                  ) : undefined,
              };
            })}
          />
        </Card>
      </div>
    </div>
  );
};
