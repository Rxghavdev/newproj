//import statements
import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
} from "react";
import { useAuth } from "../context/AuthContext";
import * as api from "../services/api";
import GooglePlacesAutocomplete from "react-google-places-autocomplete";
import { FaStar, FaRegStar } from "react-icons/fa";
import headless from "@headlessui/react";
import {
  GoogleMap,
  Marker,
  DirectionsRenderer,
  useJsApiLoader,
} from "@react-google-maps/api";
import { io } from "socket.io-client";
import { Dialog } from "@headlessui/react";
//socket
const socket = io("http://localhost:5000", {
  withCredentials: true,
});

const mapContainerStyle = {
  width: "100%",
  height: "400px",
  borderRadius: "15px",
  overflow: "hidden",
  boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
};

const defaultCenter = { lat: 20.5937, lng: 78.9629 };
const speed = 40;

export default function UserDashboard() {
  const { user } = useAuth();
  const [activeBookings, setActiveBookings] = useState([]);
  const [recentBooking, setRecentBooking] = useState(null);
  const [showAllBookings, setShowAllBookings] = useState(false);
  const [scheduleBooking, setScheduleBooking] = useState(false);
  const [newBooking, setNewBooking] = useState({
    pickupLocation: null,
    dropoffLocation: null,
    pickupCoordinates: { coordinates: { lat: 0.0, lng: 0.0 } },
    dropoffCoordinates: { coordinates: { lat: 0.0, lng: 0.0 } },
    vehicleType: "car",
    scheduledAt: "",
  });
  const [loading, setLoading] = useState(true);
  const [pastBookings, setPastBookings] = useState([]);
  const [driverLocation, setDriverLocation] = useState(null);
  const [eta, setEta] = useState(null);
  const [bookingId, setBookingId] = useState("");
  const [alerted, setAlerted] = useState(false);
  const [directions, setDirections] = useState(null);
  const [showRatingPopup, setShowRatingPopup] = useState(false);
  const [rating, setRating] = useState(0);
  const [isRatingModalOpen, setIsRatingModalOpen] = useState(false);
  const [currentRatingBookingId, setCurrentRatingBookingId] = useState(null);

  const mapRef = useRef(null);
  const Modal = ({ isOpen, onClose, children }) => {
    if (!isOpen) return null;
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg max-w-sm w-full">
          {children}
          <button
            onClick={onClose}
            className="mt-4 w-full py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            Close
          </button>
        </div>
      </div>
    );
  };
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY,
    libraries: ["geometry", "places"],
  });
  //useEffect statements
  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const response = await api.getUserBookings();
        const bookings = response.data.bookings;

        bookings.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        const completed = bookings.filter((b) => b.status === "completed");
        const active = bookings.filter((b) => b.status !== "completed");

        setRecentBooking(active[0] || null);
        setActiveBookings(active.slice(1));
        setPastBookings(completed);
      } catch (error) {
        console.error("Error fetching bookings:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchBookings();
  }, []);

  useEffect(() => {
    if (!recentBooking || !isLoaded) return;

    const bookingId = recentBooking._id;
    setBookingId(bookingId);
    socket.emit("joinBookingRoom", bookingId);
    //socket connection
    socket.on("locationUpdate", async (data) => {
      const driverLoc = { lat: data.lat, lng: data.lng };
      setDriverLocation(driverLoc);

      let destination = null;
      if (recentBooking.status === "accepted") {
        destination = recentBooking.pickupCoordinates?.coordinates;
      } else if (recentBooking.status === "in_progress") {
        destination = recentBooking.dropoffCoordinates?.coordinates;
      }

      if (destination) {
        calculateRoute(driverLoc, destination);
      }

      if (
        window.google &&
        window.google.maps &&
        window.google.maps.geometry &&
        destination
      ) {
        const driverLatLng = new window.google.maps.LatLng(data.lat, data.lng);
        const destinationLatLng = new window.google.maps.LatLng(
          destination.lat,
          destination.lng
        );

        const distance =
          window.google.maps.geometry.spherical.computeDistanceBetween(
            driverLatLng,
            destinationLatLng
          );

        if (
          distance <= 1000 &&
          !alerted &&
          recentBooking.status === "accepted"
        ) {
          alert("Your driver is within 1 km of your pickup location!");
          setAlerted(true);
        }

        const speedMs = (speed * 1000) / 3600;
        const estimatedTimeSeconds = distance / speedMs;
        const estimatedTimeMinutes = Math.round(estimatedTimeSeconds / 60);
        setEta(estimatedTimeMinutes);
      }
    });
    //listening to booking status
    socket.on(`booking:${bookingId}:status`, (data) => {
      setRecentBooking((prev) => ({ ...prev, status: data.status }));

      if (data.status === "completed") {
        if (data.status === "completed") {
          setIsRatingModalOpen(true);
          setCurrentRatingBookingId(bookingId);
        }

        setAlerted(false);
        setEta(null);
        setDirections(null);
        setDriverLocation(null);
        setShowRatingPopup(true);
      } else if (data.status === "cancelled") {
        setAlerted(false);
        setEta(null);
        setDirections(null);
        setDriverLocation(null);
      }
    });

    return () => {
      // Clean up socket listeners
      socket.off("locationUpdate");
      socket.off(`booking:${bookingId}:status`);
    };
  }, [recentBooking, isLoaded, alerted]);

  const calculateRoute = useCallback(async (origin, destination) => {
    if (!origin || !destination) return;

    const directionsService = new window.google.maps.DirectionsService();
    try {
      const result = await directionsService.route({
        origin,
        destination,
        travelMode: window.google.maps.TravelMode.DRIVING,
      });

      setDirections((prevDirections) => {
        if (
          prevDirections &&
          result.routes[0].overview_polyline ===
            prevDirections.routes[0].overview_polyline
        ) {
          return prevDirections;
        }
        return result;
      });
    } catch (error) {
      console.error("Error calculating route:", error);
    }
  }, []);
  //rating driver
  const handleNewBookingChange = (field, value) => {
    setNewBooking((prev) => ({ ...prev, [field]: value }));
  };

  const handleRateDriver = async (bookingId, rating) => {
    try {
      await api.rateDriver({ bookingId, rating });
      alert("Driver rated successfully!");
      setPastBookings((prev) =>
        prev.map((booking) =>
          booking._id === bookingId ? { ...booking, rating } : booking
        )
      );
      setIsRatingModalOpen(false);
      setCurrentRatingBookingId(null);
    } catch (error) {
      console.error("Error rating driver:", error);
      alert("Failed to rate driver.");
    }
  };
  //toggle statements
  const toggleScheduleBooking = () => setScheduleBooking(!scheduleBooking);

  const handleCreateBooking = async (e) => {
    e.preventDefault();
    try {
      const response = await api.createBooking({
        pickupLocation: newBooking.pickupLocation?.label,
        pickupCoordinates: newBooking.pickupCoordinates,
        dropoffLocation: newBooking.dropoffLocation?.label,
        dropoffCoordinates: newBooking.dropoffCoordinates,
        vehicleType: newBooking.vehicleType,
      });

      setBookingId(response.data.booking._id);

      alert("Booking created successfully!");
      setRecentBooking(response.data.booking);
      setAlerted(false);
    } catch (error) {
      console.error("Error creating booking:", error);
      alert("Failed to create booking.");
    }
  };
  //schedule booking
  const handleScheduleBooking = async (e) => {
    e.preventDefault();
    try {
      await api.createBooking({
        pickupLocation: newBooking.pickupLocation?.label,
        pickupCoordinates: newBooking.pickupCoordinates,
        dropoffLocation: newBooking.dropoffLocation?.label,
        dropoffCoordinates: newBooking.dropoffCoordinates,
        vehicleType: newBooking.vehicleType,
        scheduledAt: newBooking.scheduledAt,
      });

      alert("Booking scheduled successfully!");
    } catch (error) {
      console.error("Error scheduling booking:", error);
      alert("Failed to schedule booking.");
    }
  };

  const toggleBookingsView = () => setShowAllBookings(!showAllBookings);

  const [initialMapCenter, setInitialMapCenter] = useState(defaultCenter);

  useEffect(() => {
    if (isLoaded && recentBooking) {
      setInitialMapCenter(
        recentBooking.pickupCoordinates?.coordinates || defaultCenter
      );
    }
  }, [isLoaded, recentBooking]);

  const mapOptions = useMemo(
    () => ({
      disableDefaultUI: true,
      zoomControl: true,
    }),
    []
  );

  const onLoad = useCallback((map) => {
    mapRef.current = map;
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-lg text-white">Loading bookings...</div>
      </div>
    );
  }

  const carIcon = {
    url: "https://maps.google.com/mapfiles/kml/shapes/cabs.png", //url for car
    scaledSize: new window.google.maps.Size(40, 40),
    anchor: new window.google.maps.Point(20, 20),
  };

  const renderStars = (currentRating, onRate) => {
    const totalStars = 5;
    const stars = [];

    for (let i = 1; i <= totalStars; i++) {
      if (i <= currentRating) {
        stars.push(
          <FaStar
            key={i}
            className="text-yellow-400 cursor-pointer"
            onClick={() => onRate(i)}
          />
        );
      } else {
        stars.push(
          <FaRegStar
            key={i}
            className="text-gray-400 cursor-pointer"
            onClick={() => onRate(i)}
          />
        );
      }
    }

    return stars;
  };

  return (
    <div className="p-6 bg-gray-900 min-h-screen text-white">
      <h2 className="text-3xl font-bold mb-6 text-center">
        Hi, Welcome to Atlan Logistic Service
      </h2>
      <div className="max-w-md mx-auto bg-gray-800 p-6 rounded-lg shadow-lg mb-8">
        <h3 className="text-xl font-semibold mb-4 text-center">
          Create or Schedule a New Booking
        </h3>
        <form className="space-y-4">
          <GooglePlacesAutocomplete
            selectProps={{
              value: newBooking.pickupLocation,
              onChange: (selectedPlace) => {
                if (
                  selectedPlace &&
                  selectedPlace.value &&
                  selectedPlace.value.place_id
                ) {
                  const service = new window.google.maps.places.PlacesService(
                    document.createElement("div")
                  );

                  service.getDetails(
                    {
                      placeId: selectedPlace.value.place_id,
                      fields: ["geometry", "formatted_address", "name"],
                    },
                    (place, status) => {
                      if (
                        status ===
                        window.google.maps.places.PlacesServiceStatus.OK
                      ) {
                        const lat = place.geometry.location.lat();
                        const lng = place.geometry.location.lng();
                        handleNewBookingChange("pickupCoordinates", {
                          coordinates: { lat, lng },
                        });

                        const pickupLocation = {
                          label: place.formatted_address,
                          name: place.name,
                          coordinates: { lat, lng },
                        };
                        handleNewBookingChange(
                          "pickupLocation",
                          pickupLocation
                        );
                      } else {
                        console.error("Error fetching place details:", status);
                      }
                    }
                  );
                }
              },
              placeholder: "Enter pickup location",
              className: "bg-gray-700 text-black rounded-md",
            }}
          />

          <GooglePlacesAutocomplete
            selectProps={{
              value: newBooking.dropoffLocation,
              onChange: (selectedPlace) => {
                if (
                  selectedPlace &&
                  selectedPlace.value &&
                  selectedPlace.value.place_id
                ) {
                  const service = new window.google.maps.places.PlacesService(
                    document.createElement("div")
                  );
                  service.getDetails(
                    {
                      placeId: selectedPlace.value.place_id,
                      fields: ["geometry", "formatted_address", "name"],
                    },
                    (place, status) => {
                      if (
                        status ===
                        window.google.maps.places.PlacesServiceStatus.OK
                      ) {
                        const lat = place.geometry.location.lat();
                        const lng = place.geometry.location.lng();
                        handleNewBookingChange("dropoffCoordinates", {
                          coordinates: { lat, lng },
                        });

                        const dropoffLocation = {
                          label: place.formatted_address,
                          name: place.name,
                          coordinates: { lat, lng },
                        };

                        handleNewBookingChange(
                          "dropoffLocation",
                          dropoffLocation
                        );
                      } else {
                        console.error("Error fetching place details:", status);
                      }
                    }
                  );
                }
              },
              placeholder: "Enter dropoff location",
              className: "bg-gray-700 text-black rounded-md",
            }}
          />

          <select
            value={newBooking.vehicleType}
            onChange={(e) =>
              handleNewBookingChange("vehicleType", e.target.value)
            }
            className="w-full px-4 py-2 bg-gray-700 text-white rounded-md"
          >
            <option value="car">Car</option>
            <option value="truck">Truck</option>
            <option value="bike">Bike</option>
          </select>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={scheduleBooking}
              onChange={toggleScheduleBooking}
              className="w-5 h-5 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
            />
            <label className="text-white">Schedule this booking</label>
          </div>

          {scheduleBooking && (
            <input
              type="datetime-local"
              value={newBooking.scheduledAt}
              onChange={(e) =>
                handleNewBookingChange("scheduledAt", e.target.value)
              }
              className="w-full px-4 py-2 bg-gray-700 text-white rounded-md"
            />
          )}

          <div className="flex justify-between">
            <button
              onClick={handleCreateBooking}
              className="w-[48%] py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Create Booking
            </button>
            <button
              onClick={handleScheduleBooking}
              className="w-[48%] py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              disabled={!scheduleBooking}
            >
              Schedule Booking
            </button>
          </div>
        </form>
      </div>
      {recentBooking && (
        <div className="max-w-md mx-auto bg-gray-800 p-6 rounded-md shadow-md mb-8">
          <h3 className="text-xl font-semibold mb-4 text-center">
            Your Recent Booking
          </h3>
          <div>
            <p className="text-center">
              {recentBooking.pickupLocation} → {recentBooking.dropoffLocation}
            </p>
            <div className="text-center text-gray-300 space-y-2 mt-2">
              <p>Vehicle: {recentBooking.vehicleType}</p>
              <p>Status: {recentBooking.status}</p>
              <p className="font-bold text-green-400">
                Price: ₹{parseFloat(recentBooking.price).toFixed(2)}
              </p>
              {eta !== null && (
                <p>
                  {recentBooking.status === "accepted"
                    ? `Estimated Time of Arrival: ${eta} minutes`
                    : recentBooking.status === "in_progress"
                    ? `Estimated Time of Delivery: ${eta} minutes`
                    : null}
                </p>
              )}
            </div>
            {isLoaded && (
              <div className="mt-4">
                <GoogleMap
                  mapContainerStyle={mapContainerStyle}
                  center={initialMapCenter}
                  zoom={14}
                  options={mapOptions}
                  onLoad={onLoad}
                >
                  {directions && (
                    <DirectionsRenderer
                      directions={directions}
                      options={{
                        suppressMarkers: true, // Don't show default markers
                      }}
                    />
                  )}
                  {driverLocation && (
                    <Marker
                      position={driverLocation}
                      icon={carIcon}
                      // Remove label to prevent overlap
                    />
                  )}
                  {/* Pickup Location Marker */}
                  {recentBooking.pickupCoordinates && (
                    <Marker
                      position={recentBooking.pickupCoordinates.coordinates}
                      label="Pickup"
                      visible={recentBooking.status !== "in_progress"}
                      icon={{
                        url: "http://maps.google.com/mapfiles/ms/icons/green-dot.png",
                      }}
                    />
                  )}

                  {/* Dropoff Location Marker */}
                  {recentBooking.dropoffCoordinates && (
                    <Marker
                      position={recentBooking.dropoffCoordinates.coordinates}
                      label="Dropoff"
                      icon={{
                        url: "http://maps.google.com/mapfiles/ms/icons/red-dot.png",
                      }}
                    />
                  )}
                </GoogleMap>
              </div>
            )}
          </div>
        </div>
      )}

      <button
        onClick={toggleBookingsView}
        className="block mx-auto bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 mb-4"
      >
        {showAllBookings ? "Hide Active Bookings" : "View Active Bookings"}
      </button>

      {showAllBookings && (
        <div className="max-w-md mx-auto space-y-4">
          {activeBookings.map((booking) => (
            <div key={booking._id} className="bg-gray-800 p-4 rounded-md">
              <p>
                {booking.pickupLocation} → {booking.dropoffLocation}
              </p>
              <p>Vehicle: {booking.vehicleType}</p>
              <p>Status: {booking.status}</p>
            </div>
          ))}
        </div>
      )}
      <h3 className="text-xl font-semibold text-center mt-8">Past Bookings</h3>
      <div className="max-w-md mx-auto space-y-4">
        {pastBookings.map((booking) => (
          <div key={booking._id} className="bg-gray-800 p-4 rounded-md">
            <p>
              {booking.pickupLocation} → {booking.dropoffLocation}
            </p>
            <p>Vehicle: {booking.vehicleType}</p>
            <div className="flex mt-2">
              {renderStars(booking.rating || 0, () => {})}
            </div>
          </div>
        ))}
      </div>

      <Modal
        isOpen={isRatingModalOpen}
        onClose={() => setIsRatingModalOpen(false)}
      >
        <h3 className="text-lg font-semibold mb-4 text-center">
          Rate Your Driver
        </h3>
        <div className="flex justify-center space-x-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <FaStar
              key={star}
              className="text-yellow-400 cursor-pointer"
              onClick={() => handleRateDriver(currentRatingBookingId, star)}
              size={30}
            />
          ))}
        </div>
        <p className="text-center text-gray-600 mt-2">
          Click on a star to rate
        </p>
      </Modal>
    </div>
  );
}
