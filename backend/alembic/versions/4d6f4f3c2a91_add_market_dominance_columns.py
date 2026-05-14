"""add market dominance columns

Revision ID: 4d6f4f3c2a91
Revises: 135fafa0ddcf
Create Date: 2026-05-14 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "4d6f4f3c2a91"
down_revision: Union[str, Sequence[str], None] = "135fafa0ddcf"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("market_summary", sa.Column("market_dominance_indi_kospi", sa.Float(), nullable=True))
    op.add_column("market_summary", sa.Column("market_dominance_inst_kospi", sa.Float(), nullable=True))
    op.add_column("market_summary", sa.Column("market_dominance_frgn_kospi", sa.Float(), nullable=True))
    op.add_column("market_summary", sa.Column("market_dominance_indi_kosdaq", sa.Float(), nullable=True))
    op.add_column("market_summary", sa.Column("market_dominance_inst_kosdaq", sa.Float(), nullable=True))
    op.add_column("market_summary", sa.Column("market_dominance_frgn_kosdaq", sa.Float(), nullable=True))
    op.execute(
        """
        with grouped as (
            select
                r.date,
                s.market,
                sum(r.net_buy_indi) as net_buy_indi,
                sum(r.net_buy_inst) as net_buy_inst,
                sum(r.net_buy_frgn) as net_buy_frgn
            from market_raw_data r
            join stock_master s on s.ticker = r.ticker
            where coalesce(r.trade_value, 0) >= 1000000000
            group by r.date, s.market
        ),
        dominance as (
            select
                date,
                market,
                case
                    when abs(net_buy_indi) + abs(net_buy_inst) + abs(net_buy_frgn) = 0 then 0
                    else net_buy_indi::float / (abs(net_buy_indi) + abs(net_buy_inst) + abs(net_buy_frgn))
                end as dominance_indi,
                case
                    when abs(net_buy_indi) + abs(net_buy_inst) + abs(net_buy_frgn) = 0 then 0
                    else net_buy_inst::float / (abs(net_buy_indi) + abs(net_buy_inst) + abs(net_buy_frgn))
                end as dominance_inst,
                case
                    when abs(net_buy_indi) + abs(net_buy_inst) + abs(net_buy_frgn) = 0 then 0
                    else net_buy_frgn::float / (abs(net_buy_indi) + abs(net_buy_inst) + abs(net_buy_frgn))
                end as dominance_frgn
            from grouped
        ),
        pivoted as (
            select
                date,
                max(dominance_indi) filter (where market = 'KOSPI') as market_dominance_indi_kospi,
                max(dominance_inst) filter (where market = 'KOSPI') as market_dominance_inst_kospi,
                max(dominance_frgn) filter (where market = 'KOSPI') as market_dominance_frgn_kospi,
                max(dominance_indi) filter (where market = 'KOSDAQ') as market_dominance_indi_kosdaq,
                max(dominance_inst) filter (where market = 'KOSDAQ') as market_dominance_inst_kosdaq,
                max(dominance_frgn) filter (where market = 'KOSDAQ') as market_dominance_frgn_kosdaq
            from dominance
            group by date
        )
        update market_summary ms
        set
            market_dominance_indi_kospi = coalesce(p.market_dominance_indi_kospi, 0),
            market_dominance_inst_kospi = coalesce(p.market_dominance_inst_kospi, 0),
            market_dominance_frgn_kospi = coalesce(p.market_dominance_frgn_kospi, 0),
            market_dominance_indi_kosdaq = coalesce(p.market_dominance_indi_kosdaq, 0),
            market_dominance_inst_kosdaq = coalesce(p.market_dominance_inst_kosdaq, 0),
            market_dominance_frgn_kosdaq = coalesce(p.market_dominance_frgn_kosdaq, 0)
        from pivoted p
        where p.date = ms.date
        """
    )


def downgrade() -> None:
    op.drop_column("market_summary", "market_dominance_frgn_kosdaq")
    op.drop_column("market_summary", "market_dominance_inst_kosdaq")
    op.drop_column("market_summary", "market_dominance_indi_kosdaq")
    op.drop_column("market_summary", "market_dominance_frgn_kospi")
    op.drop_column("market_summary", "market_dominance_inst_kospi")
    op.drop_column("market_summary", "market_dominance_indi_kospi")
