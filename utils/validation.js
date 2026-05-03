const mongoose = require('mongoose');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[0-9+\-\s()]{7,20}$/;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const TIME_REGEX = /^(0?[1-9]|1[0-2]):[0-5][0-9]\s?(AM|PM)$/i;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s]).{8,}$/;

const HALL_TYPES = ['Conference', 'Banquet', 'Auditorium', 'Seminar', 'Sports'];
const PAYMENT_METHODS = ['Cash', 'Online Slip'];
const BOOKING_STATUSES = ['Pending', 'Approved', 'Rejected', 'Cancelled'];

const trimValue = (value) => (typeof value === 'string' ? value.trim() : value);
const normalizePayload = (payload = {}) =>
  Object.fromEntries(Object.entries(payload).map(([key, value]) => [key, trimValue(value)]));

const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value);
const isValidEmail = (value) => EMAIL_REGEX.test(trimValue(value || ''));
const isValidPhone = (value) => PHONE_REGEX.test(trimValue(value || ''));
const isValidPassword = (value) => PASSWORD_REGEX.test(trimValue(value || ''));
const isValidDate = (value) => {
  const text = trimValue(value || '');
  if (!DATE_REGEX.test(text)) return false;
  const [year, month, day] = text.split('-').map(Number);
  const date = new Date(`${text}T00:00:00`);
  return (
    !Number.isNaN(date.getTime()) &&
    date.getFullYear() === year &&
    date.getMonth() + 1 === month &&
    date.getDate() === day
  );
};
const isFutureOrToday = (value) => {
  if (!isValidDate(value)) return false;
  const inputDate = new Date(`${trimValue(value)}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return inputDate >= today;
};
const isValidTime = (value) => TIME_REGEX.test(trimValue(value || ''));
const timeToMinutes = (value) => {
  const match = trimValue(value || '').match(/^(0?[1-9]|1[0-2]):([0-5][0-9])\s?(AM|PM)$/i);
  if (!match) return null;
  let hours = Number(match[1]) % 12;
  const minutes = Number(match[2]);
  if (match[3].toUpperCase() === 'PM') hours += 12;
  return hours * 60 + minutes;
};

const validateRegisterPayload = (payload) => {
  const data = normalizePayload(payload);
  if (!data.name) return 'Name is required.';
  if (data.name.length < 2) return 'Name must be at least 2 characters.';
  if (!data.email) return 'Email is required.';
  if (!isValidEmail(data.email)) return 'Enter a valid email address.';
  if (!data.password) return 'Password is required.';
  if (data.password.length < 8) return 'Password must be at least 8 characters.';
  if (!isValidPassword(data.password)) return 'Password must include uppercase, lowercase, number, and special character.';
  if (data.phone && !isValidPhone(data.phone)) return 'Enter a valid phone number.';
  if (data.role && !['user', 'hall_owner', 'admin'].includes(data.role)) return 'Invalid account role.';
  return null;
};

const validateLoginPayload = (payload) => {
  const data = normalizePayload(payload);
  if (!data.email) return 'Email is required.';
  if (!isValidEmail(data.email)) return 'Enter a valid email address.';
  if (!data.password) return 'Password is required.';
  return null;
};

const validateProfilePayload = (payload) => {
  const data = normalizePayload(payload);
  if ('name' in data) {
    if (!data.name) return 'Name is required.';
    if (data.name.length < 2) return 'Name must be at least 2 characters.';
  }
  if (data.phone && !isValidPhone(data.phone)) return 'Enter a valid phone number.';
  if (data.password && data.password.length < 8) return 'Password must be at least 8 characters.';
  if (data.password && !isValidPassword(data.password)) return 'Password must include uppercase, lowercase, number, and special character.';
  return null;
};

const parseAmenities = (amenities) => {
  if (!amenities) return [];
  if (Array.isArray(amenities)) return amenities.map((item) => trimValue(item)).filter(Boolean);
  return String(amenities).split(',').map((item) => item.trim()).filter(Boolean);
};

const validateHallPayload = (payload) => {
  const data = normalizePayload(payload);
  if (!data.name) return 'Hall name is required.';
  if (data.name.length < 3) return 'Hall name must be at least 3 characters.';
  if (!data.description) return 'Description is required.';
  if (data.description.length < 20) return 'Description must be at least 20 characters.';
  if (!data.location) return 'Location is required.';
  if (data.location.length < 3) return 'Location must be at least 3 characters.';
  if (!Number.isFinite(Number(data.capacity)) || Number(data.capacity) <= 0) return 'Capacity must be greater than 0.';
  if (!Number.isInteger(Number(data.capacity))) return 'Capacity must be a whole number.';
  if (!Number.isFinite(Number(data.pricePerHour)) || Number(data.pricePerHour) <= 0) return 'Price per hour must be greater than 0.';
  if (!HALL_TYPES.includes(data.hallType)) return 'Invalid hall type.';
  if (!parseAmenities(data.amenities).length) return 'Please provide at least one amenity.';
  return null;
};

const validateBookingPayload = (payload) => {
  const data = normalizePayload(payload);
  if (!isValidObjectId(data.hallId)) return 'Invalid hall selection.';
  if (!data.bookingDate) return 'Booking date is required.';
  if (!isValidDate(data.bookingDate)) return 'Booking date must use YYYY-MM-DD.';
  if (!isFutureOrToday(data.bookingDate)) return 'Booking date cannot be in the past.';
  if (!data.startTime || !isValidTime(data.startTime)) return 'Start time must use format 09:00 AM.';
  if (!data.endTime || !isValidTime(data.endTime)) return 'End time must use format 09:00 AM.';
  const start = timeToMinutes(data.startTime);
  const end = timeToMinutes(data.endTime);
  if (start === null || end === null || end <= start) return 'End time must be after start time.';
  if (!Number.isFinite(Number(data.totalHours)) || Number(data.totalHours) <= 0) return 'Total hours must be greater than 0.';
  const duration = (end - start) / 60;
  if (Math.abs(Number(data.totalHours) - duration) > 0.01) return 'Total hours must match the selected time range.';
  if (!data.purpose) return 'Purpose is required.';
  if (data.purpose.length < 10) return 'Purpose must be at least 10 characters.';
  return null;
};

const validatePaymentPayload = (payload) => {
  const data = normalizePayload(payload);
  if (!isValidObjectId(data.bookingId)) return 'Invalid booking.';
  if (!PAYMENT_METHODS.includes(data.paymentMethod)) return 'Invalid payment method.';
  return null;
};

const validateReviewPayload = (payload) => {
  const data = normalizePayload(payload);
  if (!isValidObjectId(data.hallId) || !isValidObjectId(data.bookingId)) return 'Invalid review target.';
  const rating = Number(data.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return 'Rating must be between 1 and 5.';
  if (!data.comment) return 'Comment is required.';
  if (data.comment.length < 10) return 'Comment must be at least 10 characters.';
  return null;
};

const validateVisitorPayload = (payload) => {
  const data = normalizePayload(payload);
  if (!data.name) return 'Visitor name is required.';
  if (data.name.length < 2) return 'Visitor name must be at least 2 characters.';
  if (!data.email || !isValidEmail(data.email)) return 'Enter a valid visitor email address.';
  if (!data.phone || !isValidPhone(data.phone)) return 'Enter a valid visitor phone number.';
  if (!isValidObjectId(data.hallId)) return 'Invalid hall selection.';
  if (!data.visitDate) return 'Visit date is required.';
  if (!isValidDate(data.visitDate)) return 'Visit date must use YYYY-MM-DD.';
  if (!isFutureOrToday(data.visitDate)) return 'Visit date cannot be in the past.';
  if (!data.purpose) return 'Purpose is required.';
  if (data.purpose.length < 5) return 'Purpose must be at least 5 characters.';
  return null;
};

const validateBookingStatus = (status) => BOOKING_STATUSES.includes(trimValue(status || ''));

module.exports = {
  BOOKING_STATUSES,
  HALL_TYPES,
  PAYMENT_METHODS,
  isValidObjectId,
  normalizePayload,
  parseAmenities,
  validateBookingPayload,
  validateBookingStatus,
  validateHallPayload,
  validateLoginPayload,
  validatePaymentPayload,
  validateProfilePayload,
  validateRegisterPayload,
  validateReviewPayload,
  validateVisitorPayload,
  isValidEmail,
  isValidPassword,
};
