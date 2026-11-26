import { MeterList } from 'components/charts/MeterList';
import { RankedBars } from 'components/charts/RankedBars';
import { Card, StatTile } from 'components/charts/StatTile';
import { StatusTag } from 'components/charts/StatusTag';
import { type FC } from 'react';
import { formatPct, formatPremium, plural } from 'utils/format';
import {
  codeLabel,
  type Overview as OverviewData,
  type StoreComparison,
} from 'utils/insights';

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
          label="Preços encontrados"
          value={formatPct(ratio(o.priced, o.checked))}
          detail={`${o.priced} de ${o.checked} verificações loja × SKU`}
        />
        <StatTile
          label="Disponível para compra"
          value={formatPct(ratio(o.purchasable, o.availabilityChecked))}
          detail={
            notPurchasable > 0 ? (
              <StatusTag
                kind="warning"
                label={plural(
                  notPurchasable,
                  'listado, mas indisponível para compra',
                  'listados, mas indisponíveis para compra',
                )}
              />
            ) : (
              `${o.purchasable} de ${o.availabilityChecked} verificações de carrinho`
            )
          }
        />
        <StatTile
          label="SKUs × lojas"
          value={`${o.skus} × ${o.stores.length}`}
          detail="na última coleta"
        />
        <StatTile
          label="Erros"
          value={String(o.errors)}
          detail={
            o.errors ? (
              <StatusTag
                kind="critical"
                label="bloqueios, tempo esgotado ou falhas de leitura"
              />
            ) : (
              <StatusTag kind="good" label="todas as lojas responderam" />
            )
          }
        />
      </div>

      <div className={styles.cards}>
        <Card
          title="Posicionamento de preço"
          subtitle="Diferença média em relação à menor oferta disponível do mesmo SKU · quanto menor a barra, mais barata"
        >
          <RankedBars
            label="Diferença média em relação à menor oferta, por loja"
            items={comparison.map((s) => ({
              key: s.store,
              label: s.store,
              value: s.avgPremium,
              valueText:
                s.avgPremium == null ? '—' : formatPremium(s.avgPremium),
              detail: s.compared
                ? `Mais barata em ${s.wins} de ${s.compared} SKUs · ${formatPct(s.promoShare)} em promoção`
                : 'Nenhum SKU em comum com outra loja',
            }))}
          />
        </Card>

        <Card
          title="Cobertura"
          subtitle="SKUs com preço na última coleta, por loja"
        >
          <MeterList
            label="Preços encontrados por loja"
            items={o.stores.map((s) => {
              const blocked = s.availabilityChecked - s.purchasable;
              const reasons = s.topCodes
                .filter((c) => c.code !== 'NOT_PURCHASABLE')
                .slice(0, 3)
                .map((c) => `${codeLabel(c.code)} ${c.count}`)
                .join(' · ');
              return {
                key: s.store,
                label: s.store,
                part: s.priced,
                whole: s.checked,
                valueText: `${s.priced}/${s.checked}`,
                extra:
                  s.errors || blocked || reasons || s.partner ? (
                    <>
                      {s.errors > 0 && (
                        <StatusTag
                          kind="critical"
                          label={plural(s.errors, 'erro', 'erros')}
                        />
                      )}
                      {blocked > 0 && (
                        <StatusTag
                          kind="warning"
                          label={plural(
                            blocked,
                            'indisponível para compra',
                            'indisponíveis para compra',
                          )}
                        />
                      )}
                      {s.partner > 0 && (
                        <span className={styles.reasons}>
                          {plural(
                            s.partner,
                            'vendido por parceiro',
                            'vendidos por parceiros',
                          )}
                        </span>
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
