from sqlalchemy import Column, Integer, BigInteger, String, Float, Boolean, Date, DateTime, Text, Index
from app.models.base import Base

class StockMaster(Base):
    __tablename__ = "stock_master"

    ticker = Column(String(6), primary_key=True)
    name = Column(String(64), nullable=False)
    sector = Column(String(64))
    market = Column(String(8), nullable=False)  # KOSPI | KOSDAQ
    is_active = Column(Boolean, nullable=False, default=True)
    updated_at = Column(DateTime, nullable=False)

    __table_args__ = (
        Index("ix_stock_master_market", "market"),
        Index("ix_stock_master_sector", "sector"),
    )

class MarketRawData(Base):
    __tablename__ = "market_raw_data"

    date = Column(Date, primary_key=True)
    ticker = Column(String(6), primary_key=True)
    open = Column(Integer)
    high = Column(Integer)
    low = Column(Integer)
    close = Column(Integer)
    volume = Column(BigInteger)
    trade_value = Column(BigInteger)
    net_buy_indi = Column(BigInteger)
    net_buy_inst = Column(BigInteger)
    net_buy_frgn = Column(BigInteger)
    net_qty_inst = Column(BigInteger)
    net_qty_frgn = Column(BigInteger)

    __table_args__ = (
        Index("ix_market_raw_data_ticker_date", "ticker", "date"),
    )

class MarketIndicators(Base):
    __tablename__ = "market_indicators"

    date = Column(Date, primary_key=True)
    ticker = Column(String(6), primary_key=True)
    ma_5 = Column(Float)
    ma_20 = Column(Float)
    ma_60 = Column(Float)
    ma_120 = Column(Float)
    dominance_indi = Column(Float)
    dominance_inst = Column(Float)
    dominance_frgn = Column(Float)
    sfi_inst = Column(Float)
    sfi_frgn = Column(Float)
    quadrant = Column(String(32))
    conflict_intensity = Column(Float)
    avg_cost_5d_inst = Column(Float)
    avg_cost_20d_inst = Column(Float)
    avg_cost_60d_inst = Column(Float)
    avg_cost_5d_frgn = Column(Float)
    avg_cost_20d_frgn = Column(Float)
    avg_cost_60d_frgn = Column(Float)
    defense_status = Column(String(32))
    defense_status_inverted = Column(Boolean)
    type = Column(String(8))
    type_intensity = Column(Float)
    priority_score = Column(Float)
    weighted_priority = Column(Float)

    __table_args__ = (
        Index("ix_market_indicators_date_type", "date", "type"),
        Index("ix_market_indicators_date_defense_status", "date", "defense_status"),
        Index("ix_market_indicators_date_weighted_priority", "date", "weighted_priority"),
    )

class MarketSummary(Base):
    __tablename__ = "market_summary"

    date = Column(Date, primary_key=True)
    market_sfi_inst_kospi = Column(Float)
    market_sfi_inst_kosdaq = Column(Float)
    market_sfi_inst_total = Column(Float)
    market_sfi_frgn_kospi = Column(Float)
    market_sfi_frgn_kosdaq = Column(Float)
    market_sfi_frgn_total = Column(Float)
    top_sector_inst = Column(String(64))
    top_sector_frgn = Column(String(64))
    count_type_a = Column(Integer)
    count_type_b = Column(Integer)
    count_type_c = Column(Integer)
    count_type_d = Column(Integer)
    market_brief_text = Column(Text)

class ArchivePatternStats(Base):
    __tablename__ = "archive_pattern_stats"

    type = Column(String(8), primary_key=True)
    as_of_date = Column(Date, primary_key=True)
    total_count = Column(Integer)
    avg_return_5d = Column(Float)
    win_rate_5d = Column(Float)
    avg_return_20d = Column(Float)
    win_rate_20d = Column(Float)

class MaEvents(Base):
    __tablename__ = "ma_events"

    ticker = Column(String(6), primary_key=True)
    date = Column(Date, primary_key=True)
    event_type = Column(String(16), primary_key=True)
    short_value = Column(Float, nullable=False)
    long_value = Column(Float, nullable=False)

    __table_args__ = (
        Index("ix_ma_events_ticker_date", "ticker", "date"),
    )

class MarketIndex(Base):
    __tablename__ = "market_index"

    date = Column(Date, primary_key=True)
    kospi_close = Column(Float)
    kospi_change_pct = Column(Float)
    kosdaq_close = Column(Float)
    kosdaq_change_pct = Column(Float)
    usdkrw_close = Column(Float)
    updated_at = Column(DateTime, nullable=False)
