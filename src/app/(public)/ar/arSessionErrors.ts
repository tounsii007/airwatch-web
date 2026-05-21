import { t } from '@/lib/i18n/translations';
import type { AppLanguage } from '@/lib/types';
import type { CameraStatus } from '@/app/(public)/ar/useCameraStream';
import type { OrientationStatus } from '@/app/(public)/ar/useDeviceOrientation';
import type { PositionStatus } from '@/app/(public)/ar/useUserPosition';

export interface ArErrorInfo {
  title: string;
  message: string;
}

/**
 * Pure mapping from session-permission state → localised error copy.
 *
 * Every title + message goes through `t(language)` so a German user
 * sees „Kamera blockiert" and an Arabic user sees "الكاميرا محظورة"
 * instead of the previously-hardcoded German fallback.
 *
 * The runtime-supplied `message` from the underlying permission API
 * (e.g. a low-level Media error string) is preferred when present —
 * it usually carries platform-specific detail that the generic
 * dictionary entry can't anticipate.
 */

function cameraError(status: CameraStatus, message: string | null, language: AppLanguage): ArErrorInfo | null {
  if (status === 'denied') {
    return {
      title: t('ar_err_camera_denied_title', language),
      message: t('ar_err_camera_denied_body', language),
    };
  }
  if (status === 'unsupported') {
    return {
      title: t('ar_err_camera_unsupported_title', language),
      message: message ?? t('ar_err_camera_unsupported_body', language),
    };
  }
  if (status === 'error') {
    return {
      title: t('ar_err_camera_error_title', language),
      message: message ?? t('ar_err_camera_error_body', language),
    };
  }
  return null;
}

function orientationError(status: OrientationStatus, language: AppLanguage): ArErrorInfo | null {
  if (status === 'denied') {
    return {
      title: t('ar_err_orientation_denied_title', language),
      message: t('ar_err_orientation_denied_body', language),
    };
  }
  if (status === 'unsupported') {
    return {
      title: t('ar_err_orientation_unsupported_title', language),
      message: t('ar_err_orientation_unsupported_body', language),
    };
  }
  return null;
}

function positionError(status: PositionStatus, message: string | null, language: AppLanguage): ArErrorInfo | null {
  if (status === 'denied') {
    return {
      title: t('ar_err_position_denied_title', language),
      message: t('ar_err_position_denied_body', language),
    };
  }
  if (status === 'unsupported') {
    return {
      title: t('ar_err_position_unsupported_title', language),
      message: t('ar_err_position_unsupported_body', language),
    };
  }
  if (status === 'error') {
    return {
      title: t('ar_err_position_error_title', language),
      message: message ?? t('ar_err_position_error_body', language),
    };
  }
  return null;
}

interface Inputs {
  cameraStatus: CameraStatus;
  cameraMessage: string | null;
  orientationStatus: OrientationStatus;
  positionStatus: PositionStatus;
  positionMessage: string | null;
  language: AppLanguage;
}

/** First unrecoverable error wins — keeps the error panel focused on one thing. */
export function firstFatalError(inputs: Inputs): ArErrorInfo | null {
  return (
    cameraError(inputs.cameraStatus, inputs.cameraMessage, inputs.language)
    ?? orientationError(inputs.orientationStatus, inputs.language)
    ?? positionError(inputs.positionStatus, inputs.positionMessage, inputs.language)
  );
}
