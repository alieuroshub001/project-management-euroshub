// components/employee/attendance/NamazModal.tsx
'use client';

import { Modal, Button, Typography, Select, Form } from 'antd';
import { useState, useEffect } from 'react';

const { Text } = Typography;
const { Option } = Select;

type NamazType = 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';

interface NamazFormValues {
  namazType: NamazType;
}

interface NamazModalProps {
  visible: boolean;
  onCancel: () => void;
  onAction: (action: 'start' | 'end', namazType?: NamazType) => void;
  isNamazActive: boolean;
}

export default function NamazModal({
  visible,
  onCancel,
  onAction,
  isNamazActive,
}: NamazModalProps) {
  const [form] = Form.useForm<NamazFormValues>();
  const [loading, setLoading] = useState<boolean>(false);

  const namazTypes: ReadonlyArray<{ value: NamazType; label: string }> = [
    { value: 'fajr', label: 'Fajr (Dawn)' },
    { value: 'dhuhr', label: 'Dhuhr (Noon)' },
    { value: 'asr', label: 'Asr (Afternoon)' },
    { value: 'maghrib', label: 'Maghrib (Sunset)' },
    { value: 'isha', label: 'Isha (Night)' },
  ] as const;

  const getCurrentNamazTime = (): NamazType => {
    const hour = new Date().getHours();
    if (hour >= 4 && hour < 6) return 'fajr';
    if (hour >= 12 && hour < 15) return 'dhuhr';
    if (hour >= 15 && hour < 18) return 'asr';
    if (hour >= 18 && hour < 20) return 'maghrib';
    if (hour >= 20 || hour < 4) return 'isha';
    return 'dhuhr'; // default
  };

const handleStartNamaz = async (values: NamazFormValues) => {
  setLoading(true);
  try {
    await onAction('start', values.namazType);
  } catch (error) {
    console.error('Start prayer time failed:', error);
  } finally {
    setLoading(false);
  }
};

const handleEndNamaz = async () => {
  setLoading(true);
  try {
    await onAction('end');
  } catch (error) {
    console.error('End prayer time failed:', error);
  } finally {
    setLoading(false);
  }
};


  useEffect(() => {
    if (visible && !isNamazActive) {
      form.setFieldsValue({
        namazType: getCurrentNamazTime(),
      });
    }
  }, [visible, isNamazActive, form]);

  if (isNamazActive) {
    return (
      <Modal
        title="End Prayer Time"
        open={visible}
        onCancel={onCancel}
        footer={[
          <Button key="cancel" onClick={onCancel}>
            Cancel
          </Button>,
          <Button
            key="action"
            type="primary"
            onClick={handleEndNamaz}
            loading={loading}
          >
            End Prayer Time
          </Button>,
        ]}
      >
        <Text>Are you sure you want to end your current prayer time?</Text>
      </Modal>
    );
  }

  return (
    <Modal title="Start Prayer Time" open={visible} onCancel={onCancel} footer={null}>
      <Form<NamazFormValues> form={form} onFinish={handleStartNamaz} layout="vertical">
        <Text className="block mb-4">Are you sure you want to start prayer time?</Text>

        <Form.Item<NamazFormValues>
          name="namazType"
          label="Prayer Type"
          rules={[{ required: true, message: 'Please select prayer type' }]}
        >
          <Select placeholder="Select prayer type">
            {namazTypes.map((type) => (
              <Option key={type.value} value={type.value}>
                {type.label}
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item>
          <div className="flex justify-end space-x-2">
            <Button onClick={onCancel}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={loading}>
              Start Prayer Time
            </Button>
          </div>
        </Form.Item>
      </Form>
    </Modal>
  );
}
