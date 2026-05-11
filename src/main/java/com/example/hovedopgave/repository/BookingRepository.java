package com.example.hovedopgave.repository;

import com.example.hovedopgave.model.Booking;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

public interface BookingRepository extends JpaRepository<Booking, Integer> {
    List<Booking> findByUserUserId(Integer userId);
    void deleteAllByUserUserId(Integer userId);
    List<Booking> findAllByFacilityFacilityIdAndDateOrderByStartTimeAsc(Integer facilityId, LocalDate date);
    List<Booking> findAllByFacilityFacilityIdAndDateBetweenOrderByDateAsc(Integer facilityId, LocalDate startDate, LocalDate endDate);
    List<Booking> findAllByUserUserIdAndFacilityTypeIgnoreCaseAndDateBetweenOrderByDateAsc(
            Integer userId,
            String type,
            LocalDate startDate,
            LocalDate endDate
    );
    void deleteAllByFacilityFacilityId(Integer facilityId);
    boolean existsByFacilityFacilityIdAndDateAndStartTimeLessThanAndEndTimeGreaterThan(
            Integer facilityId,
            LocalDate date,
            LocalTime endTime,
            LocalTime startTime
    );
}
