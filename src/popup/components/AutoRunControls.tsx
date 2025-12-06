import { Button, Space, Tooltip } from "antd";
import { 
  PlayCircleOutlined, 
  PauseCircleOutlined, 
  LeftOutlined,
  RightOutlined,
  ThunderboltOutlined,
  PlusOutlined,
  ReloadOutlined
} from "@ant-design/icons";

interface AutoRunControlsProps {
  isAutoRunning: boolean;
  isPending: boolean;
  currentIndex: number;
  totalCount: number;
  onStartAuto: () => void;
  onStopAuto: () => void;
  onNavigatePrevious: () => void;
  onNavigateNext: () => void;
  onProcessCurrent: () => void;
  onGenerateRandom: () => void;
  onClearQueue: () => void;
  hasQueue: boolean;
}

export default function AutoRunControls({
  isAutoRunning,
  isPending,
  currentIndex,
  totalCount,
  onStartAuto,
  onStopAuto,
  onNavigatePrevious,
  onNavigateNext,
  onProcessCurrent,
  onGenerateRandom,
  onClearQueue,
  hasQueue
}: AutoRunControlsProps) {
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex < totalCount - 1;

  return (
    <div style={{ marginBottom: '16px' }}>
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        {/* Auto-run controls */}
        <Space wrap>
          {!isAutoRunning ? (
            <Tooltip title="Bật chế độ tự động xử lý hàng loạt">
              <Button
                type="primary"
                icon={<PlayCircleOutlined />}
                onClick={onStartAuto}
                disabled={!hasQueue || isPending}
                style={{ 
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  border: 'none'
                }}
              >
                Bật Auto
              </Button>
            </Tooltip>
          ) : (
            <Tooltip title="Dừng chế độ tự động">
              <Button
                danger
                icon={<PauseCircleOutlined />}
                onClick={onStopAuto}
              >
                Dừng Auto
              </Button>
            </Tooltip>
          )}
        </Space>

        {/* Manual navigation controls */}
        <Space wrap>
          <Tooltip title="Chuyển về CCCD trước đó">
            <Button
              icon={<LeftOutlined />}
              onClick={onNavigatePrevious}
              disabled={!hasPrevious || isPending || isAutoRunning}
            >
              Trước
            </Button>
          </Tooltip>

          <Tooltip title="Xử lý CCCD hiện tại">
            <Button
              type="primary"
              icon={<ThunderboltOutlined />}
              onClick={onProcessCurrent}
              disabled={!hasQueue || isPending || isAutoRunning}
              style={{
                background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
                border: 'none'
              }}
            >
              Xử lý
            </Button>
          </Tooltip>

          <Tooltip title="Chuyển sang CCCD tiếp theo">
            <Button
              icon={<RightOutlined />}
              onClick={onNavigateNext}
              disabled={!hasNext || isPending || isAutoRunning}
            >
              Sau
            </Button>
          </Tooltip>
        </Space>

        {/* Queue management */}
        <Space wrap>
          <Tooltip title="Tạo 50 CCCD ngẫu nhiên cho test">
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={onGenerateRandom}
              disabled={isPending}
              style={{
                background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                border: 'none'
              }}
            >
              Tạo 50 người
            </Button>
          </Tooltip>

          {hasQueue && (
            <Tooltip title="Xóa toàn bộ hàng đợi">
              <Button
                danger
                icon={<ReloadOutlined />}
                onClick={onClearQueue}
                disabled={isPending || isAutoRunning}
              >
                Xóa hàng đợi
              </Button>
            </Tooltip>
          )}
        </Space>
      </Space>
    </div>
  );
}
