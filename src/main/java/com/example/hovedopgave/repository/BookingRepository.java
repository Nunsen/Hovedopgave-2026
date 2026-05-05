package com.example.hovedopgave.repository;

import com.example.hovedopgave.model.Booking;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

public interface BookingRepository extends JpaRepository<Booking, Integer> {
    List<Booking> findByUserUserId(Integer userId);
    List<Booking> findAllByFacilityFacilityIdAndDateOrderByStartTimeAsc(Integer facilityId, LocalDate date);
    void deleteAllByFacilityFacilityId(Integer facilityId);
    boolean existsByFacilityFacilityIdAndDateAndStartTimeLessThanAndEndTimeGreaterThan(
            Integer facilityId,
            LocalDate date,
            LocalTime endTime,
            LocalTime startTime
    );
}
