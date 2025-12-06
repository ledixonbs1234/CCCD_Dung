import { Progress, Card, Statistic, Row, Col } from "antd";
import { CheckCircleOutlined, ClockCircleOutlined, CloseCircleOutlined, SyncOutlined } from "@ant-design/icons";
import { CCCDInfo } from "../utils/cccdGenerator";

interface QueueStatusPanelProps {
  queueData: Record<string, CCCDInfo>;
}

export default function QueueStatusPanel({ queueData }: QueueStatusPanelProps) {
  const cccdList = Object.values(queueData || {});
  
  const pending = cccdList.filter(c => c.status === 'pending').length;
  const processing = cccdList.filter(c => c.status === 'processing').length;
  const completed = cccdList.filter(c => c.status === 'completed').length;
  const error = cccdList.filter(c => c.status === 'error').length;
  const total = cccdList.length;

  const completedPercent = total > 0 ? Math.round((completed / total) * 100) : 0;
  const successPercent = total > 0 ? Math.round(((completed) / total) * 100) : 0;

  return (
    <Card 
      title="📊 Trạng thái hàng đợi" 
      size="small"
      style={{ marginBottom: '16px' }}
    >
      <Progress
        percent={completedPercent}
        success={{ percent: successPercent }}
        strokeColor={{
          '0%': '#108ee9',
          '100%': '#87d068',
        }}
        status={processing > 0 ? "active" : "normal"}
        style={{ marginBottom: '16px' }}
      />
      
      <Row gutter={8}>
        <Col span={6}>
          <Statistic
            title="Đang chờ"
            value={pending}
            prefix={<ClockCircleOutlined style={{ color: '#faad14' }} />}
            valueStyle={{ fontSize: '20px', color: '#faad14' }}
          />
        </Col>
        <Col span={6}>
          <Statistic
            title="Đang xử lý"
            value={processing}
            prefix={<SyncOutlined spin style={{ color: '#1890ff' }} />}
            valueStyle={{ fontSize: '20px', color: '#1890ff' }}
          />
        </Col>
        <Col span={6}>
          <Statistic
            title="Hoàn thành"
            value={completed}
            prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
            valueStyle={{ fontSize: '20px', color: '#52c41a' }}
          />
        </Col>
        <Col span={6}>
          <Statistic
            title="Lỗi"
            value={error}
            prefix={<CloseCircleOutlined style={{ color: '#ff4d4f' }} />}
            valueStyle={{ fontSize: '20px', color: '#ff4d4f' }}
          />
        </Col>
      </Row>

      <div style={{ 
        marginTop: '12px', 
        fontSize: '12px', 
        color: '#666',
        textAlign: 'center' 
      }}>
        Tổng: {total} CCCD
      </div>
    </Card>
  );
}
